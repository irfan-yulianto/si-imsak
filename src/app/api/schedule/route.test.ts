// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => false),
  extractClientIp: vi.fn(() => "127.0.0.1"),
}));

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/schedule");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const validCityId = "58a2fc6ed39fd083f55d4182bf88826d";
const YEAR = String(new Date().getFullYear());

function mockUpstreamSuccess(date: string) {
  return {
    status: true,
    data: {
      kabko: "KOTA JAKARTA",
      prov: "DKI JAKARTA",
      jadwal: {
        [date]: {
          tanggal: `Minggu, 01/03/${YEAR}`,
          imsak: "04:30",
          subuh: "04:40",
          terbit: "05:50",
          dhuha: "06:15",
          dzuhur: "12:00",
          ashar: "15:15",
          maghrib: "18:05",
          isya: "19:15",
        },
      },
    },
  };
}

beforeEach(async () => {
  vi.restoreAllMocks();
  const { isRateLimited } = await import("@/lib/rate-limit");
  vi.mocked(isRateLimited).mockReturnValue(false);
});

describe("GET /api/schedule", () => {
  it("returns 429 when rate limited", async () => {
    const { isRateLimited } = await import("@/lib/rate-limit");
    vi.mocked(isRateLimited).mockReturnValue(true);

    const res = await GET(makeRequest({ city_id: validCityId, year: YEAR, month: "3" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when city_id is missing", async () => {
    const res = await GET(makeRequest({ year: YEAR, month: "3" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when year is missing", async () => {
    const res = await GET(makeRequest({ city_id: validCityId, month: "3" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when month is missing", async () => {
    const res = await GET(makeRequest({ city_id: validCityId, year: YEAR }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid city_id (not MD5)", async () => {
    const res = await GET(makeRequest({ city_id: "not-valid", year: YEAR, month: "3" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("city_id");
  });

  it("returns 400 for uppercase hex city_id", async () => {
    const res = await GET(makeRequest({ city_id: "58A2FC6ED39FD083F55D4182BF88826D", year: YEAR, month: "3" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a year before last year", async () => {
    const year = String(new Date().getFullYear() - 2);
    const res = await GET(makeRequest({ city_id: validCityId, year, month: "3" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a year after next year", async () => {
    const year = String(new Date().getFullYear() + 2);
    const res = await GET(makeRequest({ city_id: validCityId, year, month: "3" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for month 0", async () => {
    const res = await GET(makeRequest({ city_id: validCityId, year: YEAR, month: "0" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for month 13", async () => {
    const res = await GET(makeRequest({ city_id: validCityId, year: YEAR, month: "13" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-integer year", async () => {
    const res = await GET(makeRequest({ city_id: validCityId, year: "2024.5", month: "3" }));
    expect(res.status).toBe(400);
  });

  it("returns 502 when all upstream calls fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const res = await GET(makeRequest({ city_id: validCityId, year: YEAR, month: "3" }));
    expect(res.status).toBe(502);
  });

  it("returns 200 with jadwal array on success", async () => {
    const date = `${YEAR}-03-01`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUpstreamSuccess(date)),
      })
    );

    const res = await GET(makeRequest({ city_id: validCityId, year: YEAR, month: "3" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe(true);
    expect(json.data.jadwal).toBeDefined();
    expect(json.data.lokasi).toBe("KOTA JAKARTA");
    expect(json.data.daerah).toBe("DKI JAKARTA");
  });

  it("transforms v3 response to v2 format with date field", async () => {
    const date = `${YEAR}-03-01`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUpstreamSuccess(date)),
      })
    );

    const res = await GET(makeRequest({ city_id: validCityId, year: YEAR, month: "3" }));
    const json = await res.json();
    const firstDay = json.data.jadwal[0];
    expect(firstDay.date).toBe(`${YEAR}-03-01`);
    expect(firstDay.imsak).toBe("04:30");
    expect(firstDay.tanggal).toBe(`Minggu, 01/03/${YEAR}`);
  });

  describe("monthly fetch, gaps and caching", () => {
    const day = (date: string) => ({
      tanggal: `X, ${date}`, imsak: "04:30", subuh: "04:40", terbit: "05:50", dhuha: "06:15",
      dzuhur: "12:00", ashar: "15:15", maghrib: "18:05", isya: "19:15",
    });
    // March always has 31 days
    const marchDates = Array.from({ length: 31 }, (_, i) => `${YEAR}-03-${String(i + 1).padStart(2, "0")}`);
    const upstream = (dates: string[]) => ({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        status: true,
        data: { kabko: "KOTA JAKARTA", prov: "DKI JAKARTA", jadwal: Object.fromEntries(dates.map((d) => [d, day(d)])) },
      }),
    });

    it("uses a single upstream call when the monthly endpoint returns the full month", async () => {
      const mockFetch = vi.fn().mockResolvedValue(upstream(marchDates));
      vi.stubGlobal("fetch", mockFetch);

      const res = await GET(makeRequest({ city_id: validCityId, year: YEAR, month: "3" }));
      const json = await res.json();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toMatch(new RegExp(`/jadwal/${validCityId}/${YEAR}-03$`));
      expect(json.data.jadwal).toHaveLength(31);
      expect(json.partial).toBeUndefined();
      expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
    });

    it("falls back to per-day calls when the monthly endpoint is not supported", async () => {
      const mockFetch = vi.fn((url: string) => {
        const period = url.split("/").pop()!;
        if (period.length === 7) return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve(upstream([period]));
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await GET(makeRequest({ city_id: validCityId, year: YEAR, month: "3" }));
      const json = await res.json();
      // 1 monthly probe (404, not retried) + 31 day calls
      expect(mockFetch).toHaveBeenCalledTimes(32);
      expect(json.data.jadwal).toHaveLength(31);
      expect(res.headers.get("Cache-Control")).toContain("s-maxage");
    });

    it("marks a month with missing days as partial and uncacheable", async () => {
      const mockFetch = vi.fn((url: string) => {
        const period = url.split("/").pop()!;
        if (period.length === 7) return Promise.resolve(upstream(marchDates.slice(0, 30)));
        return Promise.resolve({ ok: false, status: 500 });
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await GET(makeRequest({ city_id: validCityId, year: YEAR, month: "3" }));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.partial).toBe(true);
      expect(json.data.jadwal).toHaveLength(30);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    it("retries a day whose body is not valid JSON", async () => {
      let calls = 0;
      const mockFetch = vi.fn((url: string) => {
        const period = url.split("/").pop()!;
        if (period.length === 7) return Promise.resolve(upstream(marchDates.slice(1)));
        calls++;
        if (calls === 1) return Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError("bad")) });
        return Promise.resolve(upstream([period]));
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await GET(makeRequest({ city_id: validCityId, year: YEAR, month: "3" }));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.data.jadwal).toHaveLength(31);
    });
  });
});
