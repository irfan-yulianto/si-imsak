/**
 * In-process rate limiter using a sliding window algorithm.
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

const windowMs = 60_000; // 1 minute window
const maxRequests = 30; // max requests per window per IP
const MAX_IPS = 10000; // max tracked IPs to prevent memory exhaustion

const requests = new Map<string, number[]>();

// Clean up stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requests) {
    const valid = timestamps.filter((t) => now - t < windowMs);
    if (valid.length === 0) requests.delete(key);
    else requests.set(key, valid);
  }
}, 300_000);

/**
 * Extract client IP from request.
 * On Vercel, x-vercel-forwarded-for / x-real-ip / x-forwarded-for are set by the
 * platform and overwrite client-supplied values. Elsewhere, the rightmost
 * x-forwarded-for entry (added by the nearest proxy) is used, so prepended IPs
 * can't be spoofed.
 */
export function extractClientIp(request: { headers?: Headers | Record<string, string> | { get: (name: string) => string | null } } | string | null): string {
  if (!request) return "unknown";

  if (typeof request === "string") {
    const parts = request.split(",");
    const last = parts[parts.length - 1]?.trim();
    return last || "unknown";
  }

  const headers = request.headers;
  if (!headers) return "unknown";

  const getHeader = (name: string): string | null => {
    if ('get' in headers && typeof headers.get === "function") {
      return headers.get(name) as string | null;
    }
    const record = headers as Record<string, string>;
    return record[name] || record[name.toLowerCase()] || null;
  };

  const vercelIp = getHeader("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelIp) return vercelIp;

  const xRealIp = getHeader("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  const xForwardedFor = getHeader("x-forwarded-for");
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",");
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }

  return "unknown";
}

export function isRateLimited(ip: string, limit: number = maxRequests): boolean {
  const key = limit === maxRequests ? ip : `${ip}:${limit}`;
  const now = Date.now();
  const timestamps = requests.get(key) || [];
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= limit) {
    requests.set(key, valid);
    return true;
  }

  // Bound memory: evict the oldest-tracked key instead of rejecting new clients
  // (rejecting would let a flood of spoofed IPs lock everyone out).
  if (!requests.has(key) && requests.size >= MAX_IPS) {
    const oldest = requests.keys().next().value;
    if (oldest !== undefined) requests.delete(oldest);
  }

  // Re-insert so Map order tracks recency for eviction
  requests.delete(key);
  valid.push(now);
  requests.set(key, valid);
  return false;
}
