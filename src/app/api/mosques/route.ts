import { checkRateLimit } from "@/lib/rate-limit";
import { SEARCH_RADII, SEARCH_DECIMALS } from "@/lib/mosques";
import { loadMosqueData } from "@/lib/mosque-index";
import { CDN_CACHE_DAY, INDONESIA_BOUNDS, NO_STORE, roundCoord } from "@/lib/constants";
import { json, tooManyRequests } from "@/lib/http";
import { suggestionToken } from "@/lib/upstream";
import type { MosqueSearchResponse } from "@/types";
import type { NextRequest } from "next/server";

const fail = (error: string, status: number) => json<MosqueSearchResponse>({ status: false, error }, { status });

/**
 * The mosques nearest a point, from the dataset built every week from OpenStreetMap
 * (data/mosques.tsv). The point comes rounded to ~1 km: nearby users share CDN entries,
 * and the answer reaches far enough around it (meta.coverage) for the client to order
 * the mosques from the exact position. Clients of earlier versions send a radius and get
 * the mosques within it, as before.
 */
export async function GET(request: NextRequest) {
  const limit = checkRateLimit(request, "mosques");
  if (!limit.ok) return tooManyRequests<MosqueSearchResponse>({ status: false, error: "Too many requests" }, limit.retryAfterS);

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radius = request.nextUrl.searchParams.get("radius");
  if (!lat || !lng) return fail("Missing lat/lng parameters", 400);

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || latNum < INDONESIA_BOUNDS.latMin || latNum > INDONESIA_BOUNDS.latMax) {
    return fail("Invalid latitude", 400);
  }
  if (isNaN(lngNum) || lngNum < INDONESIA_BOUNDS.lngMin || lngNum > INDONESIA_BOUNDS.lngMax) {
    return fail("Invalid longitude", 400);
  }
  const radiusNum = radius === null ? null : parseInt(radius, 10);
  if (radiusNum !== null && !SEARCH_RADII.includes(radiusNum)) {
    return fail(`Invalid radius (one of ${SEARCH_RADII.join(", ")} m)`, 400);
  }

  const data = await loadMosqueData();
  if (!data) {
    return json<MosqueSearchResponse>(
      { status: false, error: "Mosque data unavailable", retryable: true },
      { status: 503, cache: NO_STORE }
    );
  }

  // Earlier versions: the nearest 50 within their radius, from ~110 m precision
  const legacy = radiusNum !== null;
  const center = legacy
    ? { lat: roundCoord(latNum), lng: roundCoord(lngNum) }
    : { lat: roundCoord(latNum, SEARCH_DECIMALS), lng: roundCoord(lngNum, SEARCH_DECIMALS) };
  const { mosques, coverage } = legacy
    ? data.index.nearest(center.lat, center.lng, { minReach: radiusNum, maxReach: radiusNum, minCount: 1, maxCount: 50 })
    : data.index.nearest(center.lat, center.lng);

  // Whether /api/mosques/suggest is on, so the finder shows its button only then (the
  // CDN keeps this a day; a new token means a new deployment, and a fresh cache)
  const suggestions = suggestionToken() !== "";
  return json<MosqueSearchResponse>(
    { status: true, data: mosques, meta: { center, coverage: Math.round(coverage), dataDate: data.dataDate, suggestions } },
    { cache: CDN_CACHE_DAY, headers: { "X-Data-Date": data.dataDate } }
  );
}
