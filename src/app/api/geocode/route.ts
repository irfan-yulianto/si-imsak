import { checkRateLimit } from "@/lib/rate-limit";
import { extractCityFromNominatim, normalizeToMyquranName, type NominatimAddress } from "@/lib/geocode";
import { CDN_CACHE_DAY, GEOCODE_DECIMALS, INDONESIA_BOUNDS, NO_STORE, roundCoord } from "@/lib/constants";
import { NOMINATIM_REVERSE_URL } from "@/lib/upstream";
import { createGate, json, tooManyRequests, upstreamFetch } from "@/lib/http";
import { log, errorMessage } from "@/lib/log";
import { isObject } from "@/lib/validate";
import type { GeocodeResponse } from "@/types";
import type { NextRequest } from "next/server";

/** The whole lookup, waiting for Nominatim's turn included */
const TIMEOUT_MS = 5_000;
const NO_CITY: GeocodeResponse = { status: false, city: "" };

// Nominatim's usage policy allows one request a second. Per instance here; the CDN
// answers repeated positions without reaching it.
const nominatimTurn = createGate(1_000);

export async function GET(request: NextRequest) {
  const limit = checkRateLimit(request, "geocode");
  if (!limit.ok) return tooManyRequests(NO_CITY, limit.retryAfterS);

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  if (!lat || !lng) return json(NO_CITY, { status: 400 });

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || latNum < INDONESIA_BOUNDS.latMin || latNum > INDONESIA_BOUNDS.latMax) {
    return json(NO_CITY, { status: 400 });
  }
  if (isNaN(lngNum) || lngNum < INDONESIA_BOUNDS.lngMin || lngNum > INDONESIA_BOUNDS.lngMax) {
    return json(NO_CITY, { status: 400 });
  }

  const deadline = AbortSignal.any([request.signal, AbortSignal.timeout(TIMEOUT_MS)]);
  try {
    await nominatimTurn(deadline);
    // Only the city is wanted: ~1 km of the position is plenty, reveals little, and
    // lets nearby users share cache entries
    const url = `${NOMINATIM_REVERSE_URL}?lat=${roundCoord(latNum, GEOCODE_DECIMALS)}&lon=${roundCoord(lngNum, GEOCODE_DECIMALS)}&format=json&zoom=10&addressdetails=1&accept-language=id`;
    const res = await upstreamFetch(url, { signal: deadline, timeoutMs: TIMEOUT_MS });
    if (!res.ok) {
      log("error", { route: "geocode", upstreamStatus: res.status });
      return json(NO_CITY, { status: 502, cache: NO_STORE });
    }

    const data: unknown = await res.json();
    const address = isObject(data) && isObject(data.address) ? (data.address as NominatimAddress) : null;
    const rawCity = extractCityFromNominatim(address);
    // "No city here" is a real answer, so it is cached like a hit
    const city = rawCity ? normalizeToMyquranName(rawCity) : "";
    return json<GeocodeResponse>({ status: !!city, city }, { cache: CDN_CACHE_DAY });
  } catch (err) {
    log("error", { route: "geocode", error: errorMessage(err) });
    return json(NO_CITY, { status: 502, cache: NO_STORE });
  }
}
