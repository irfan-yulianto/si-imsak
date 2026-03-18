import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchCities, getSchedule } from "./api";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("searchCities", () => {
  it("calls fetch with correct URL encoding", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: true, data: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await searchCities("banda aceh");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/cities?q=banda%20aceh",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("returns parsed JSON on success", async () => {
    const expected = { status: true, data: [{ id: "1", lokasi: "KOTA JAKARTA" }] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(expected) })
    );

    const result = await searchCities("jakarta");
    expect(result).toEqual(expected);
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );

    await expect(searchCities("test")).rejects.toThrow("Failed to search cities");
  });

  it("respects external abort signal", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () => new Promise((_, reject) => {
          controller.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          );
        })
      )
    );

    const promise = searchCities("test", controller.signal);
    controller.abort();
    await expect(promise).rejects.toThrow();
  });
});

describe("getSchedule", () => {
  const mockSchedule = {
    status: true,
    data: {
      id: "abc123",
      lokasi: "KOTA JAKARTA",
      daerah: "DKI JAKARTA",
      jadwal: [{ date: "2026-03-01", imsak: "04:30" }],
    },
  };

  it("calls fetch with correct parameters", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchedule),
    });
    vi.stubGlobal("fetch", mockFetch);

    await getSchedule("abc123", 2026, 3);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/schedule?city_id=abc123&year=2026&month=3",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("caches to localStorage on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchedule),
      })
    );

    await getSchedule("abc123", 2026, 3);
    const cached = localStorage.getItem("schedule_abc123_2026_3");
    expect(cached).toBeTruthy();
    const parsed = JSON.parse(cached!);
    expect(parsed._ts).toBeDefined();
    expect(parsed.status).toBe(true);
  });

  it("falls back to localStorage cache on fetch failure", async () => {
    // Pre-populate cache
    const cached = { _ts: Date.now(), ...mockSchedule };
    localStorage.setItem("schedule_abc123_2026_3", JSON.stringify(cached));

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const result = await getSchedule("abc123", 2026, 3);
    expect(result.status).toBe(true);
  });

  it("rejects stale cache (older than 7 days)", async () => {
    // Pre-populate with expired cache
    const oldTs = Date.now() - 8 * 24 * 3600000; // 8 days ago
    const cached = { _ts: oldTs, ...mockSchedule };
    localStorage.setItem("schedule_abc123_2026_3", JSON.stringify(cached));

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    await expect(getSchedule("abc123", 2026, 3)).rejects.toThrow("Network error");
  });

  it("removes corrupted cache entries", async () => {
    localStorage.setItem("schedule_abc123_2026_3", "not-valid-json{{{");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));

    await expect(getSchedule("abc123", 2026, 3)).rejects.toThrow("Offline");
    expect(localStorage.getItem("schedule_abc123_2026_3")).toBeNull();
  });

  it("throws original error when no cache is available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Server error")));

    await expect(getSchedule("abc123", 2026, 3)).rejects.toThrow("Server error");
  });

  it("evicts old caches when localStorage is full, then retries", async () => {
    // Pre-populate with old schedule cache
    const oldTs = Date.now() - 8 * 24 * 3600000;
    localStorage.setItem("schedule_old_2025_1", JSON.stringify({ _ts: oldTs }));

    let setItemCallCount = 0;
    const originalSetItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      setItemCallCount++;
      if (setItemCallCount === 1) {
        throw new DOMException("QuotaExceededError");
      }
      return originalSetItem(key, value);
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchedule),
      })
    );

    const result = await getSchedule("abc123", 2026, 3);
    expect(result.status).toBe(true);
  });

  it("returns parsed response on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchedule),
      })
    );

    const result = await getSchedule("abc123", 2026, 3);
    expect(result).toEqual(mockSchedule);
  });
});
