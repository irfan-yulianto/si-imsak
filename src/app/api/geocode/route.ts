import { isRateLimited, extractClientIp } from "@/lib/rate-limit";
import { extractCityFromNominatim, normalizeToMyquranName } from "@/lib/geocode";
import { CDN_CACHE_DAY, INDONESIA_BOUNDS, NO_STORE, roundCoord } from "@/lib/constants";
import { NOMINATIM_REVERSE_URL, UPSTREAM_USER_AGENT } from "@/lib/upstream";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ip = extractClientIp(request);
  if (isRateLimited(ip, 10)) {
    return NextResponse.json(
      { status: false, city: "" },
      { status: 429 }
    );
  }

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { status: false, city: "" },
      { status: 400 }
    );
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (isNaN(latNum) || latNum < INDONESIA_BOUNDS.latMin || latNum > INDONESIA_BOUNDS.latMax) {
    return NextResponse.json(
      { status: false, city: "" },
      { status: 400 }
    );
  }
  if (isNaN(lngNum) || lngNum < INDONESIA_BOUNDS.lngMin || lngNum > INDONESIA_BOUNDS.lngMax) {
    return NextResponse.json(
      { status: false, city: "" },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    // City-level lookup: ~110 m precision is plenty and lets nearby users share cache entries
    const url = `${NOMINATIM_REVERSE_URL}?lat=${roundCoord(latNum)}&lon=${roundCoord(lngNum)}&format=json&zoom=10&addressdetails=1&accept-language=id`;
    const res = await fetch(url, {
      headers: { "User-Agent": UPSTREAM_USER_AGENT },
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error("[geocode] Upstream HTTP", res.status);
      return NextResponse.json(
        { status: false, city: "" },
        { status: 502, headers: { "Cache-Control": NO_STORE } }
      );
    }

    const data = await res.json();
    const rawCity = extractCityFromNominatim(data.address);

    // "No city here" is a real answer, so it is cached like a hit
    const city = rawCity ? normalizeToMyquranName(rawCity) : "";
    return NextResponse.json(
      { status: !!city, city },
      { headers: { "Cache-Control": CDN_CACHE_DAY } }
    );
  } catch (err) {
    clearTimeout(timeout);
    console.error("[geocode] Failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { status: false, city: "" },
      { status: 502, headers: { "Cache-Control": NO_STORE } }
    );
  }
}
