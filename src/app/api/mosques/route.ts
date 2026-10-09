import { checkRateLimit } from "@/lib/rate-limit";
import { buildOverpassQuery, parseOverpassResponse, SEARCH_RADII } from "@/lib/mosques";
import { CDN_CACHE_DAY, CDN_CACHE_SHORT, INDONESIA_BOUNDS, NO_STORE, roundCoord } from "@/lib/constants";
import { OVERPASS_ENDPOINTS } from "@/lib/upstream";
import { json, tooManyRequests, upstreamFetch } from "@/lib/http";
import { log, errorMessage } from "@/lib/log";
import { isObject } from "@/lib/validate";
import type { MosqueSearchResponse } from "@/types";
import type { NextRequest } from "next/server";

export const maxDuration = 25;

/** Each mirror's own time limit */
const MIRROR_TIMEOUT_MS = 10_000;
/** A mirror that hasn't answered by then is joined by the next one */
const HEDGE_MS = 3_000;
const ALL_FAILED = "All Overpass endpoints failed";
/** How Overpass reports a query that ran out of time or memory */
const RUNTIME_ERROR = /runtime error|timed out|out of memory/i;

/** One mirror's answer, read in full */
async function askMirror(endpoint: string, query: string, signal: AbortSignal): Promise<unknown> {
  const res = await upstreamFetch(endpoint, {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal,
    timeoutMs: MIRROR_TIMEOUT_MS,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("invalid JSON");
  }
  // A query that ran out of time or memory still answers 200, with a remark and no (or
  // only some) elements: read as an answer, it would say there is no mosque nearby
  const remark = isObject(data) && typeof data.remark === "string" ? data.remark : "";
  if (RUNTIME_ERROR.test(remark)) throw new Error(remark);
  return data;
}

/**
 * Asks the Overpass mirrors in turn: the next one starts when the one before fails, or
 * hasn't answered within 3 s. The first answer wins and the others are cancelled, so a
 * search usually costs the public mirrors a single query (all three ran at once before).
 */
function fetchOverpass(query: string, signal: AbortSignal): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (OVERPASS_ENDPOINTS.length === 0) return reject(new Error(`${ALL_FAILED}: none configured`));
    if (signal.aborted) return reject(signal.reason);

    const mirrors = new AbortController();
    const errors: string[] = [];
    let started = 0;
    let settled = false;
    let hedge: ReturnType<typeof setTimeout> | undefined;

    const settle = (outcome: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedge);
      mirrors.abort();
      signal.removeEventListener("abort", onAbort);
      outcome();
    };
    const onAbort = () => settle(() => reject(signal.reason));

    const startNext = () => {
      clearTimeout(hedge);
      if (settled || started === OVERPASS_ENDPOINTS.length) return;
      const endpoint = OVERPASS_ENDPOINTS[started++];
      hedge = setTimeout(startNext, HEDGE_MS);
      askMirror(endpoint, query, mirrors.signal).then(
        (data) => settle(() => resolve(data)),
        (err) => {
          errors.push(`${endpoint}: ${errorMessage(err)}`);
          if (errors.length === OVERPASS_ENDPOINTS.length) settle(() => reject(new Error(`${ALL_FAILED}: ${errors.join("; ")}`)));
          else startNext();
        }
      );
    };

    signal.addEventListener("abort", onAbort, { once: true });
    startNext();
  });
}

const fail = (error: string, status: number) => json<MosqueSearchResponse>({ status: false, error }, { status });

export async function GET(request: NextRequest) {
  const limit = checkRateLimit(request, "mosques");
  if (!limit.ok) return tooManyRequests<MosqueSearchResponse>({ status: false, error: "Too many requests" }, limit.retryAfterS);

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radius = request.nextUrl.searchParams.get("radius") || "2000";
  if (!lat || !lng) return fail("Missing lat/lng parameters", 400);

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusNum = parseInt(radius, 10);
  if (isNaN(latNum) || latNum < INDONESIA_BOUNDS.latMin || latNum > INDONESIA_BOUNDS.latMax) {
    return fail("Invalid latitude", 400);
  }
  if (isNaN(lngNum) || lngNum < INDONESIA_BOUNDS.lngMin || lngNum > INDONESIA_BOUNDS.lngMax) {
    return fail("Invalid longitude", 400);
  }
  if (!SEARCH_RADII.includes(radiusNum)) {
    return fail(`Invalid radius (one of ${SEARCH_RADII.join(", ")} m)`, 400);
  }

  try {
    // ~110 m precision: the client measures exact distances itself, and rounding keeps
    // nearby users on the same CDN cache entry
    const qLat = roundCoord(latNum);
    const qLng = roundCoord(lngNum);
    const data = await fetchOverpass(buildOverpassQuery(qLat, qLng, radiusNum), request.signal);
    const mosques = parseOverpassResponse(data as Parameters<typeof parseOverpassResponse>[0], qLat, qLng);
    // Mosques change rarely. Nothing found is kept briefly: a mirror can lag behind
    // OpenStreetMap, and a place can be mapped in the meantime
    return json<MosqueSearchResponse>(
      { status: true, data: mosques },
      { cache: mosques.length > 0 ? CDN_CACHE_DAY : CDN_CACHE_SHORT }
    );
  } catch (err) {
    const message = errorMessage(err);
    log("error", { route: "mosques", error: message });
    const upstreamDown = message.startsWith(ALL_FAILED);
    return json<MosqueSearchResponse>(
      { status: false, error: upstreamDown ? "Upstream mosque service unavailable" : "Failed to fetch mosques", retryable: upstreamDown },
      { status: upstreamDown ? 502 : 500, cache: NO_STORE }
    );
  }
}
