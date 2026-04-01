/**
 * In-process rate limiter using a sliding window algorithm.
 *
 * ⚠️ SERVERLESS LIMITATION:
 * On Vercel (or any serverless platform), each function instance has its own
 * isolated memory. This map is NOT shared across concurrent instances — meaning
 * a single client can bypass limits by hitting different instances.
 *
 * This provides best-effort protection against unsophisticated abuse
 * (e.g., accidental loops, basic scrapers). For strict rate limiting in
 * production, replace with a distributed store such as Vercel KV (Redis).
 *
 * Acceptable trade-off for this app's current scale; upgrade path is clear.
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
 * Extract client IP from x-forwarded-for header.
 * Uses the leftmost IP (original client, set by trusted edge proxy like Vercel).
 */
export function extractClientIp(header: string | null): string {
  if (!header) return "unknown";
  // First IP is the original client (set by the edge proxy like Vercel)
  const first = header.split(",")[0]?.trim();
  return first || "unknown";
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

  // Prevent memory exhaustion from high-cardinality IPs
  if (!requests.has(key) && requests.size >= MAX_IPS) {
    return true; // Reject untracked IPs when map is full
  }

  valid.push(now);
  requests.set(key, valid);
  return false;
}
