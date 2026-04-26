import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Must re-import fresh for each test to reset module state
let extractClientIp: typeof import("./rate-limit").extractClientIp;
let isRateLimited: typeof import("./rate-limit").isRateLimited;

beforeEach(async () => {
  vi.useFakeTimers();
  // Dynamically import to get fresh module state
  vi.resetModules();
  const mod = await import("./rate-limit");
  extractClientIp = mod.extractClientIp;
  isRateLimited = mod.isRateLimited;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("extractClientIp", () => {
  it("returns 'unknown' for null input", () => {
    expect(extractClientIp(null)).toBe("unknown");
  });

  it("returns 'unknown' for empty string", () => {
    expect(extractClientIp("")).toBe("unknown");
  });

  it("returns last IP from comma-separated string", () => {
    expect(extractClientIp("1.2.3.4, 5.6.7.8")).toBe("5.6.7.8");
  });

  it("returns single IP string", () => {
    expect(extractClientIp("192.168.1.1")).toBe("192.168.1.1");
  });

  it("trims whitespace in string", () => {
    expect(extractClientIp("  10.0.0.1  , 10.0.0.2  ")).toBe("10.0.0.2");
  });

  it("extracts from request.ip", () => {
    const req = { ip: "10.0.0.3" };
    expect(extractClientIp(req)).toBe("10.0.0.3");
  });

  it("extracts from x-real-ip header", () => {
    const req = { headers: { get: (name: string) => name === "x-real-ip" ? "10.0.0.4" : null } };
    expect(extractClientIp(req)).toBe("10.0.0.4");
  });

  it("extracts rightmost from x-forwarded-for header", () => {
    const req = { headers: { get: (name: string) => name === "x-forwarded-for" ? "10.0.0.5, 10.0.0.6" : null } };
    expect(extractClientIp(req)).toBe("10.0.0.6");
  });

  it("falls back to 'unknown' if no valid IP found in request", () => {
    const req = { headers: { get: () => null } };
    expect(extractClientIp(req)).toBe("unknown");
  });
});

describe("isRateLimited", () => {
  it("returns false for first request", () => {
    expect(isRateLimited("1.1.1.1")).toBe(false);
  });

  it("returns false for requests under limit", () => {
    for (let i = 0; i < 29; i++) {
      isRateLimited("2.2.2.2");
    }
    expect(isRateLimited("2.2.2.2")).toBe(false); // 30th request
  });

  it("returns true when limit is reached", () => {
    for (let i = 0; i < 30; i++) {
      isRateLimited("3.3.3.3");
    }
    expect(isRateLimited("3.3.3.3")).toBe(true); // 31st request
  });

  it("respects custom limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      isRateLimited("4.4.4.4", 10);
    }
    expect(isRateLimited("4.4.4.4", 10)).toBe(true);
  });

  it("allows requests after window expires", () => {
    // Fill up the limit
    for (let i = 0; i < 30; i++) {
      isRateLimited("5.5.5.5");
    }
    expect(isRateLimited("5.5.5.5")).toBe(true);

    // Advance past the 60-second window
    vi.advanceTimersByTime(61000);

    expect(isRateLimited("5.5.5.5")).toBe(false);
  });

  it("uses namespaced key for custom limits", () => {
    // Default limit (30) and custom limit (10) should not interfere
    for (let i = 0; i < 10; i++) {
      isRateLimited("6.6.6.6", 10);
    }
    expect(isRateLimited("6.6.6.6", 10)).toBe(true);
    // Default limit should still have room
    expect(isRateLimited("6.6.6.6")).toBe(false);
  });
});
