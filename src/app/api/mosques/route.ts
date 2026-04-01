import { isRateLimited, extractClientIp } from "@/lib/rate-limit";
import { buildOverpassQuery, parseOverpassResponse } from "@/lib/mosques";
import { INDONESIA_BOUNDS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

async function fetchOverpass(query: string): Promise<Response> {
  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(OVERPASS_ENDPOINTS[i], {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) return res;
      // Non-ok response: try next endpoint
    } catch {
      clearTimeout(timeout);
      // Timeout or network error: try next endpoint
    }
  }
  throw new Error("All Overpass endpoints failed");
}

export async function GET(request: NextRequest) {
  const ip = extractClientIp(request.headers.get("x-forwarded-for"));
  if (isRateLimited(ip, 10)) {
    return NextResponse.json(
      { status: false, error: "Too many requests" },
      { status: 429 }
    );
  }

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radius = request.nextUrl.searchParams.get("radius") || "2000";

  if (!lat || !lng) {
    return NextResponse.json(
      { status: false, error: "Missing lat/lng parameters" },
      { status: 400 }
    );
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusNum = parseInt(radius, 10);

  if (isNaN(latNum) || latNum < INDONESIA_BOUNDS.latMin || latNum > INDONESIA_BOUNDS.latMax) {
    return NextResponse.json(
      { status: false, error: "Invalid latitude" },
      { status: 400 }
    );
  }
  if (isNaN(lngNum) || lngNum < INDONESIA_BOUNDS.lngMin || lngNum > INDONESIA_BOUNDS.lngMax) {
    return NextResponse.json(
      { status: false, error: "Invalid longitude" },
      { status: 400 }
    );
  }
  if (isNaN(radiusNum) || radiusNum < 100 || radiusNum > 10000) {
    return NextResponse.json(
      { status: false, error: "Invalid radius (100-10000m)" },
      { status: 400 }
    );
  }

  try {
    const query = buildOverpassQuery(latNum, lngNum, radiusNum);
    const res = await fetchOverpass(query);
    const data = await res.json();
    const mosques = parseOverpassResponse(data, latNum, lngNum);

    return NextResponse.json(
      { status: true, data: mosques },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { status: false, error: "Failed to fetch mosques" },
      { status: 500 }
    );
  }
}
