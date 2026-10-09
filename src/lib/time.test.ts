import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { syncServerTime } from "./time";

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
