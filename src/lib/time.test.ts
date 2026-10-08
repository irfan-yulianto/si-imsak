import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAdjustedTime, parseScheduleTime, syncServerTime } from "./time";

describe("getAdjustedTime", () => {
  it("returns close to now when offset is 0", () => {
    const before = Date.now();
    const result = getAdjustedTime(0);
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });

  it("adds positive offset correctly", () => {
    const now = Date.now();
    const result = getAdjustedTime(5000);
    expect(result.getTime()).toBeGreaterThanOrEqual(now + 4990);
    expect(result.getTime()).toBeLessThanOrEqual(now + 5100);
  });

  it("handles negative offset", () => {
    const now = Date.now();
    const result = getAdjustedTime(-3000);
    expect(result.getTime()).toBeLessThan(now);
    expect(result.getTime()).toBeGreaterThan(now - 3100);
  });
});

describe("parseScheduleTime", () => {
  it("parses 05:30 WIB correctly", () => {
    const result = parseScheduleTime("2026-03-08", "05:30", 7);
    // 05:30 WIB = 05:30 - 7h = 22:30 UTC previous day
    expect(result.getUTCHours()).toBe(22);
    expect(result.getUTCMinutes()).toBe(30);
    expect(result.getUTCDate()).toBe(7); // previous day
  });

  it("parses 18:00 WITA correctly", () => {
    const result = parseScheduleTime("2026-03-08", "18:00", 8);
    // 18:00 WITA = 18:00 - 8h = 10:00 UTC
    expect(result.getUTCHours()).toBe(10);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it("parses 04:15 WIT correctly", () => {
    const result = parseScheduleTime("2026-03-08", "04:15", 9);
    // 04:15 WIT = 04:15 - 9h = 19:15 UTC previous day
    expect(result.getUTCHours()).toBe(19);
    expect(result.getUTCMinutes()).toBe(15);
  });

  it("handles midnight edge case", () => {
    const result = parseScheduleTime("2026-03-08", "00:00", 7);
    // 00:00 WIB = -7h UTC = 17:00 UTC previous day
    expect(result.getUTCHours()).toBe(17);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it("sets seconds and milliseconds to 0", () => {
    const result = parseScheduleTime("2026-03-08", "12:30", 7);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });
});

describe("syncServerTime", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns cached offset from sessionStorage when valid", async () => {
    const cachedData = { offset: 500, ts: Date.now() - 1000 }; // 1 second ago
    sessionStorage.setItem("timeOffset", JSON.stringify(cachedData));

    vi.stubGlobal("fetch", vi.fn());
    const result = await syncServerTime();
    expect(result).toBe(500);
  });

  it("calls fetch when no cache exists", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ now: Date.now() }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await syncServerTime();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/time",
      expect.any(Object)
    );
  });

  it("calls fetch when cache is expired (>1 hour)", async () => {
    const cachedData = { offset: 500, ts: Date.now() - 3700000 }; // 1 hour + 100s ago
    sessionStorage.setItem("timeOffset", JSON.stringify(cachedData));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ now: Date.now() }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await syncServerTime();
    expect(mockFetch).toHaveBeenCalled();
  });

  it("returns 0 on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const result = await syncServerTime();
    expect(result).toBe(0);
  });

  it("returns 0 when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    );
    const result = await syncServerTime();
    expect(result).toBe(0);
  });

  it("returns 0 when server time is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ now: "invalid" }),
      })
    );
    const result = await syncServerTime();
    expect(result).toBe(0);
  });

  it("stores result in sessionStorage on success", async () => {
    const now = new Date();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ now: now.getTime() }),
      })
    );

    await syncServerTime();
    const stored = sessionStorage.getItem("timeOffset");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(typeof parsed.offset).toBe("number");
    expect(typeof parsed.ts).toBe("number");
  });

  it("passes the background-refreshed offset to onRefresh", async () => {
    sessionStorage.setItem("timeOffset", JSON.stringify({ offset: 500, ts: Date.now() - 1000 }));
    const serverNow = Date.now() + 2000;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ now: serverNow }) })
    );
    const onRefresh = vi.fn();

    const result = await syncServerTime(onRefresh);
    expect(result).toBe(500);
    await vi.waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(onRefresh.mock.calls[0][0]).toBeGreaterThan(1000);
  });

  it("does not call onRefresh when the background refresh fails", async () => {
    sessionStorage.setItem("timeOffset", JSON.stringify({ offset: 500, ts: Date.now() - 1000 }));
    const mockFetch = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", mockFetch);
    const onRefresh = vi.fn();

    await syncServerTime(onRefresh);
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
