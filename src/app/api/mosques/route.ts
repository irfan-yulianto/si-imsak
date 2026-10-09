import { isRateLimited, extractClientIp } from "@/lib/rate-limit";
import { buildOverpassQuery, parseOverpassResponse } from "@/lib/mosques";
import { CDN_CACHE_HOUR, INDONESIA_BOUNDS, roundCoord } from "@/lib/constants";
import { OVERPASS_ENDPOINTS, UPSTREAM_USER_AGENT } from "@/lib/upstream";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 25;

const FETCH_TIMEOUT = 10000;

async function fetchSingleEndpoint(endpoint: string, query: string, signal: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  const onRaceSettled = () => controller.abort();
  signal.addEventListener("abort", onRaceSettled, { once: true });
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UPSTREAM_USER_AGENT,
      },
      signal: controller.signal,
    });
    if (res.ok) return res;
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    throw new Error(`${endpoint}: ${msg}`);
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", onRaceSettled);
  }
}

/**
 * Race all mirrors and use the first success. The losing requests are aborted
 * once a winner is in, so each search costs the public mirrors one full query.
 */
async function fetchOverpass(query: string): Promise<unknown> {
  const race = new AbortController();
  try {
    return await Promise.any(
      OVERPASS_ENDPOINTS.map(async (ep) => {
        const res = await fetchSingleEndpoint(ep, query, race.signal);
        // Read the body before aborting the others — abort would cancel this stream too
        try {
          return await res.json();
        } catch {
          throw new Error(`${ep}: invalid JSON`);
        }
      })
    );
  } catch (err) {
    if (err instanceof AggregateError) {
      const details = err.errors.map((e: Error) => e.message).join("; ");
      throw new Error(`All Overpass endpoints failed: ${details}`);
    }
    throw err;
  } finally {
    race.abort();
  }
}

export async function GET(request: NextRequest) {
  const ip = extractClientIp(request);
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
    // ~110 m precision: the client recomputes exact distances, and rounding keeps
    // nearby users on the same CDN cache entry.
    const qLat = roundCoord(latNum);
    const qLng = roundCoord(lngNum);
    const query = buildOverpassQuery(qLat, qLng, radiusNum);
    const data = await fetchOverpass(query);
    const mosques = parseOverpassResponse(data as Parameters<typeof parseOverpassResponse>[0], qLat, qLng);

    return NextResponse.json(
      { status: true, data: mosques },
      {
        headers: {
          "Cache-Control": CDN_CACHE_HOUR,
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[mosques] Failed:", message);

    const isUpstream = message.includes("Overpass endpoints failed");
    return NextResponse.json(
      { status: false, error: isUpstream ? "Upstream mosque service unavailable" : "Failed to fetch mosques", retryable: isUpstream },
      { status: isUpstream ? 502 : 500 }
    );
  }
}
