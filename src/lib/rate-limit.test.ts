import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// A fresh module for each test: the windows are module state
let extractClientIp: typeof import("./rate-limit").extractClientIp;
let checkRateLimit: typeof import("./rate-limit").checkRateLimit;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  ({ extractClientIp, checkRateLimit } = await import("./rate-limit"));
});

afterEach(() => {
  vi.useRealTimers();
});

/** A request from `ip` (as Vercel reports it) */
const from = (ip: string) => ({ headers: new Headers({ "x-real-ip": ip }) });

/** Sends `n` requests and returns the last answer */
function send(n: number, ip: string, route: Parameters<typeof checkRateLimit>[1]) {
  let last = checkRateLimit(from(ip), route);
  for (let i = 1; i < n; i++) last = checkRateLimit(from(ip), route);
  return last;
}

describe("extractClientIp", () => {
  it("prefers x-vercel-forwarded-for over other headers", () => {
    const headers = new Headers({ "x-vercel-forwarded-for": "10.0.0.3", "x-real-ip": "10.0.0.9", "x-forwarded-for": "10.0.0.8" });
    expect(extractClientIp({ headers })).toBe("10.0.0.3");
  });

  it("uses x-real-ip next", () => {
    expect(extractClientIp({ headers: new Headers({ "x-real-ip": " 10.0.0.4 " }) })).toBe("10.0.0.4");
  });

  it("takes the rightmost x-forwarded-for entry, which the nearest proxy added", () => {
    expect(extractClientIp({ headers: new Headers({ "x-forwarded-for": "6.6.6.6, 10.0.0.6" }) })).toBe("10.0.0.6");
  });

  it("falls back to 'unknown'", () => {
    expect(extractClientIp({ headers: new Headers() })).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  it("allows 30 schedule requests a minute, then says when to come back", () => {
    expect(send(30, "1.1.1.1", "schedule")).toEqual({ ok: true });
    vi.advanceTimersByTime(20_000);
    expect(checkRateLimit(from("1.1.1.1"), "schedule")).toEqual({ ok: false, retryAfterS: 40 });

    // A refused request doesn't count: room again once the first ones are a minute old
    vi.advanceTimersByTime(40_000);
    expect(checkRateLimit(from("1.1.1.1"), "schedule")).toEqual({ ok: true });
  });

  it("allows 20 mosque and 10 geocode requests a minute", () => {
    expect(send(20, "2.2.2.2", "mosques")).toEqual({ ok: true });
    expect(checkRateLimit(from("2.2.2.2"), "mosques")).toMatchObject({ ok: false });
    expect(send(10, "2.2.2.2", "geocode")).toEqual({ ok: true });
    expect(checkRateLimit(from("2.2.2.2"), "geocode")).toMatchObject({ ok: false });
  });

  it("counts each route and each client separately", () => {
    send(30, "3.3.3.3", "cities");
    expect(checkRateLimit(from("3.3.3.3"), "cities")).toMatchObject({ ok: false });
    expect(checkRateLimit(from("3.3.3.3"), "schedule")).toEqual({ ok: true });
    expect(checkRateLimit(from("4.4.4.4"), "cities")).toEqual({ ok: true });
  });

  it("forgets the least recently seen client instead of refusing new ones when full", () => {
    for (let i = 0; i < 10_000; i++) checkRateLimit(from(`ip-${i}`), "schedule");
    // A brand-new client is served
    expect(checkRateLimit(from("new-client"), "schedule")).toEqual({ ok: true });
    // ...and the oldest entry was dropped: it starts a fresh window
    expect(send(30, "ip-0", "schedule")).toEqual({ ok: true });
  });
});
