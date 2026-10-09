import { CDN_CACHE_DAY, NO_STORE } from "@/lib/constants";
import { MYQURAN_API_BASE } from "@/lib/upstream";
import { json, tooManyRequests, upstreamFetch } from "@/lib/http";
import { log, errorMessage } from "@/lib/log";
import { checkRateLimit } from "@/lib/rate-limit";
import { isObject, parseCityList } from "@/lib/validate";
import type { CitySearchResponse } from "@/types";
import type { NextRequest } from "next/server";

const TIMEOUT_MS = 5_000;
const NOTHING: CitySearchResponse = { status: false, data: [] };

export async function GET(request: NextRequest) {
  const limit = checkRateLimit(request, "cities");
  if (!limit.ok) return tooManyRequests<CitySearchResponse>({ ...NOTHING, error: "Too many requests" }, limit.retryAfterS);

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) return json(NOTHING, { status: 400 });

  // Sanitize: allow only letters (any script), spaces, dots, hyphens and apostrophes
  const sanitized = q.replace(/[^\p{L}\s.\-']/gu, "").trim();
  if (sanitized.length < 2 || sanitized.length > 50) return json(NOTHING, { status: 400 });

  try {
    const res = await upstreamFetch(`${MYQURAN_API_BASE}/kota/cari/${encodeURIComponent(sanitized)}`, {
      signal: request.signal,
      timeoutMs: TIMEOUT_MS,
    });

    // v3 API returns 404 for "not found" — treat as empty results, not an error
    if (res.status === 404) return json<CitySearchResponse>({ status: true, data: [] }, { cache: CDN_CACHE_DAY });
    if (!res.ok) return json(NOTHING, { status: 502, cache: NO_STORE });

    const body: unknown = await res.json();
    // Only well-formed cities, with only the fields we use
    const found: CitySearchResponse = { status: isObject(body) && !!body.status, data: parseCityList(body) };
    return json(found, { cache: found.status ? CDN_CACHE_DAY : NO_STORE });
  } catch (err) {
    log("error", { route: "cities", error: errorMessage(err) });
    return json(NOTHING, { status: 502, cache: NO_STORE });
  }
}
