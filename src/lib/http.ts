// What the API routes share: their JSON answers, and how they call upstream services
import { NextResponse } from "next/server";
import { NO_STORE } from "@/lib/constants";
import { UPSTREAM_USER_AGENT } from "@/lib/upstream";

/** A JSON answer, with its status and how long the CDN may keep it */
export function json<T>(
  body: T,
  { status = 200, cache, headers }: { status?: number; cache?: string; headers?: Record<string, string> } = {}
): NextResponse<T> {
  return NextResponse.json<T>(body, { status, headers: { ...(cache && { "Cache-Control": cache }), ...headers } });
}

/** 429, with when the client may ask again */
export function tooManyRequests<T>(body: T, retryAfterS: number): NextResponse<T> {
  return json(body, { status: 429, cache: NO_STORE, headers: { "Retry-After": String(retryAfterS) } });
}

/**
 * A request to an upstream service: identified by our User-Agent, past Next's data cache
 * (the CDN keeps our own answers instead, and a failed answer must not be kept), and
 * cancelled by `signal` or after `timeoutMs`.
 */
export function upstreamFetch(
  url: string,
  { timeoutMs, signal, headers, ...init }: RequestInit & { timeoutMs: number; signal?: AbortSignal }
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "User-Agent": UPSTREAM_USER_AGENT, Accept: "application/json", ...headers },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
}

/**
 * Spaces calls `intervalMs` apart, per server instance: `wait()` resolves when the
 * caller's turn comes, or rejects when `signal` aborts first.
 */
export function createGate(intervalMs: number): (signal?: AbortSignal) => Promise<void> {
  let nextAt = 0;
  return (signal) => {
    const now = Date.now();
    const at = Math.max(now, nextAt);
    nextAt = at + intervalMs;
    if (at === now) return Promise.resolve();
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason);
      const timer = setTimeout(resolve, at - now);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(signal.reason);
        },
        { once: true }
      );
    });
  };
}
