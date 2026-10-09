import { CDN_CACHE_DAY, NO_STORE } from "@/lib/constants";
import { MYQURAN_API_BASE, UPSTREAM_USER_AGENT } from "@/lib/upstream";
import { log, errorMessage } from "@/lib/log";
import { isRateLimited, extractClientIp } from "@/lib/rate-limit";
import { isObject, parseCityList } from "@/lib/validate";
import type { CitySearchResponse } from "@/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ip = extractClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json<CitySearchResponse>(
      { status: false, data: [], error: "Too many requests" },
      { status: 429 }
    );
  }

  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json<CitySearchResponse>({ status: false, data: [] }, { status: 400 });
  }

  // Sanitize: allow only letters (any script), spaces, dots, hyphens and apostrophes
  const sanitized = q.replace(/[^\p{L}\s.\-']/gu, "").trim();
  if (sanitized.length < 2 || sanitized.length > 50) {
    return NextResponse.json<CitySearchResponse>({ status: false, data: [] }, { status: 400 });
  }

  try {
    // No Next.js data cache — the CDN caches our response, and a failed upstream
    // answer must not be kept for a day
    const res = await fetch(`${MYQURAN_API_BASE}/kota/cari/${encodeURIComponent(sanitized)}`, {
      cache: "no-store",
      headers: { "User-Agent": UPSTREAM_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
    });

    // v3 API returns 404 for "not found" — treat as empty results, not an error
    if (res.status === 404) {
      return NextResponse.json<CitySearchResponse>(
        { status: true, data: [] },
        { headers: { "Cache-Control": CDN_CACHE_DAY } }
      );
    }

    if (!res.ok) {
      return NextResponse.json<CitySearchResponse>(
        { status: false, data: [] },
        { status: 502, headers: { "Cache-Control": NO_STORE } }
      );
    }

    const body: unknown = await res.json();
    // Only well-formed cities, with only the fields we use
    const safeData = { status: isObject(body) && !!body.status, data: parseCityList(body) };
    return NextResponse.json<CitySearchResponse>(safeData, {
      headers: { "Cache-Control": safeData.status ? CDN_CACHE_DAY : NO_STORE },
    });
  } catch (err) {
    log("error", { route: "cities", error: errorMessage(err) });
    return NextResponse.json<CitySearchResponse>(
      { status: false, data: [] },
      { status: 502, headers: { "Cache-Control": NO_STORE } }
    );
  }
}
