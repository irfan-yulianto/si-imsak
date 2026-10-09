import { FakeStorage } from "@/__tests__/fake-storage";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reverseGeocodeCity, searchCities, getSchedule } from "./api";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reverseGeocodeCity", () => {
  it("returns city name on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: true, city: "KAB. GRESIK" }),
    }));
    expect(await reverseGeocodeCity(-7.25, 112.43)).toBe("KAB. GRESIK");
  });

  it("returns empty string on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await reverseGeocodeCity(-7.25, 112.43)).toBe("");
  });

  it("returns empty string on fetch error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(await reverseGeocodeCity(-7.25, 112.43)).toBe("");
  });

  it("returns empty string when status is false", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: false, city: "" }),
    }));
    expect(await reverseGeocodeCity(-7.25, 112.43)).toBe("");
  });

  it("sends the position to ~1 km only: enough to find the city", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: true, city: "KAB. GRESIK" }) });
    vi.stubGlobal("fetch", mockFetch);
    await reverseGeocodeCity(-7.251234, 112.438765);
    expect(mockFetch).toHaveBeenCalledWith("/api/geocode?lat=-7.25&lng=112.44", expect.any(Object));
  });
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
      expect.any(Object)
    );
  });

  it("returns the well-formed cities on success", async () => {
    const body = {
      status: true,
      data: [
        { id: "58a2fc6ed39fd083f55d4182bf88826d", lokasi: "KOTA JAKARTA" },
        { id: "1", lokasi: "OLD NUMERIC ID" },
        { id: "58a2fc6ed39fd083f55d4182bf88826d", lokasi: "" },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) })
    );

    const result = await searchCities("jakarta");
    expect(result).toEqual({ status: true, data: [{ id: "58a2fc6ed39fd083f55d4182bf88826d", lokasi: "KOTA JAKARTA", daerah: "" }] });
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
      id: "58a2fc6ed39fd083f55d4182bf88826d",
      lokasi: "KOTA JAKARTA",
      daerah: "DKI JAKARTA",
      jadwal: [
        {
          tanggal: "Minggu, 01/03/2026", date: "2026-03-01", imsak: "04:30", subuh: "04:40", terbit: "05:55",
          dhuha: "06:20", dzuhur: "12:05", ashar: "15:15", maghrib: "18:10", isya: "19:20",
        },
      ],
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
      expect.any(Object)
    );
  });

  // How lib/storage keeps a cached month
  const KEY = "si:schedule:abc123:2026-03";
  const entry = (data: unknown, ts = Date.now()) => JSON.stringify({ v: 1, ts, data });

  it("keeps the month for offline use", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchedule),
      })
    );

    await getSchedule("abc123", 2026, 3);
    const parsed = JSON.parse(localStorage.getItem(KEY)!);
    expect(parsed).toMatchObject({ v: 1, data: mockSchedule.data });
    expect(Date.now() - parsed.ts).toBeLessThan(1000);
  });

  it("falls back to the cached month on fetch failure", async () => {
    localStorage.setItem(KEY, entry(mockSchedule.data));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const result = await getSchedule("abc123", 2026, 3);
    expect(result).toEqual(mockSchedule);
  });

  it("treats a malformed answer like a failed one, and uses the cached copy", async () => {
    localStorage.setItem(KEY, entry(mockSchedule.data));
    const broken = { status: true, data: { ...mockSchedule.data, jadwal: [{ date: "2026-03-01", imsak: "04:30" }] } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(broken) }));

    const result = await getSchedule("abc123", 2026, 3);
    expect(result.data?.jadwal).toEqual(mockSchedule.data.jadwal);
  });

  it("rejects a cached month older than 7 days", async () => {
    localStorage.setItem(KEY, entry(mockSchedule.data, Date.now() - 8 * 24 * 3600000));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    await expect(getSchedule("abc123", 2026, 3)).rejects.toThrow("Network error");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("removes corrupted cache entries", async () => {
    localStorage.setItem(KEY, "not-valid-json{{{");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));

    await expect(getSchedule("abc123", 2026, 3)).rejects.toThrow("Offline");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("throws original error when no cache is available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Server error")));

    await expect(getSchedule("abc123", 2026, 3)).rejects.toThrow("Server error");
  });

  it("makes room by dropping the oldest cached month when storage is full", async () => {
    const fake = new FakeStorage();
    vi.stubGlobal("localStorage", fake);
    fake.setItem("si:schedule:old:2025-01", entry(mockSchedule.data, Date.now() - 6 * 24 * 3600000));
    fake.failures = 1;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockSchedule) }));

    const result = await getSchedule("abc123", 2026, 3);
    expect(result.status).toBe(true);
    expect(fake.keys()).toEqual([KEY]);
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

describe("getSchedule request sharing and partial months", () => {
  const ok = (body: object) => ({ ok: true, json: () => Promise.resolve(body) });

  it("shares one request between concurrent callers for the same month", async () => {
    const mockFetch = vi.fn().mockResolvedValue(ok({ status: true, data: { jadwal: [] } }));
    vi.stubGlobal("fetch", mockFetch);

    const [a, b] = await Promise.all([
      getSchedule("abc", 2026, 3),
      getSchedule("abc", 2026, 3),
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);

    // Once settled, a new call fetches again
    await getSchedule("abc", 2026, 3);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not cache partial months in localStorage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ status: true, partial: true, data: { jadwal: [] } })));
    await getSchedule("abc", 2026, 4);
    expect(localStorage.getItem("si:schedule:abc:2026-04")).toBeNull();
  });
});

describe("searchCities with an invalid query", () => {
  it("treats a 400 response as no results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    expect(await searchCities("12")).toEqual({ status: false, data: [] });
  });
});
