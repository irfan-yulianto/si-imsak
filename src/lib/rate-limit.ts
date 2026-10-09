/**
 * In-process rate limiter: a sliding one-minute window per client and route.
 *
 * ⚠️ SERVERLESS LIMITATION:
 * On Vercel (or any serverless platform), each function instance has its own
 * isolated memory. This map is NOT shared across concurrent instances — meaning
 * a single client can bypass limits by hitting different instances.
 *
 * This provides best-effort protection against unsophisticated abuse
 * (e.g., accidental loops, basic scrapers). The real protection in production is:
 * - CDN caching (s-maxage) on schedule/cities/geocode/mosques, so repeat requests
 *   never reach the function or the upstream APIs;
 * - a Vercel Firewall rate-limit rule on /api/* (configured in the dashboard, see README).
 */

const WINDOW_MS = 60_000;
/** Requests per client and minute, for each route: one route's traffic never uses up another's */
// Mosque searches: phones on one mobile carrier often share an address (CGNAT), and
// each costs the server little (the dataset is in memory)
const LIMITS = { schedule: 30, cities: 30, geocode: 10, mosques: 60 } as const;
export type LimitedRoute = keyof typeof LIMITS;
/** Most clients tracked at once, so memory stays bounded */
const MAX_KEYS = 10_000;

const requests = new Map<string, number[]>();

// Every 5 minutes, forget clients whose window has passed. unref(): this timer alone
// never keeps a process running (tests, scripts).
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requests) {
    const recent = timestamps.filter((t) => now - t < WINDOW_MS);
    if (recent.length === 0) requests.delete(key);
    else requests.set(key, recent);
  }
}, 300_000).unref?.();

/**
 * The client's IP address. On Vercel, x-vercel-forwarded-for / x-real-ip /
 * x-forwarded-for are set by the platform and overwrite client-supplied values.
 * Elsewhere, the rightmost x-forwarded-for entry (added by the nearest proxy) is used,
 * so prepended IPs can't be spoofed.
 */
export function extractClientIp(request: { headers: Pick<Headers, "get"> }): string {
  const { headers } = request;
  const vercelIp = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelIp) return vercelIp;

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return forwarded || "unknown";
}

/**
 * Counts this request against the client's limit for `route`. Over the limit, the
 * request is not counted, and `retryAfterS` says when the window has room again.
 */
export function checkRateLimit(
  request: { headers: Pick<Headers, "get"> },
  route: LimitedRoute
): { ok: true } | { ok: false; retryAfterS: number } {
  const key = `${route}:${extractClientIp(request)}`;
  const now = Date.now();
  const recent = (requests.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= LIMITS[route]) {
    requests.set(key, recent);
    return { ok: false, retryAfterS: Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000)) };
  }

  // Bound memory: evict the least recently seen client instead of rejecting new ones
  // (rejecting would let a flood of spoofed IPs lock everyone out)
  if (!requests.has(key) && requests.size >= MAX_KEYS) {
    const oldest = requests.keys().next().value;
    if (oldest !== undefined) requests.delete(oldest);
  }

  // Re-insert so the Map's order follows recency
  requests.delete(key);
  recent.push(now);
  requests.set(key, recent);
  return { ok: true };
}
