// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ ok: true })),
}));

// A fresh module per test: the outage breaker is per-instance state
let GET: typeof import("./route").GET;

function makeRequest(params: Record<string, string>, signal?: AbortSignal) {
  const url = new URL("http://localhost/api/schedule");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url, { signal });
}

const validCityId = "58a2fc6ed39fd083f55d4182bf88826d";
const YEAR = String(new Date().getUTCFullYear());
const MARCH = { city_id: validCityId, year: YEAR, month: "3" };

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
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.resetModules();
  ({ GET } = await import("./route"));
  const { checkRateLimit } = await import("@/lib/rate-limit");
  vi.mocked(checkRateLimit).mockReturnValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("GET /api/schedule", () => {
  it("returns 429 when rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(checkRateLimit).mockReturnValue({ ok: false, retryAfterS: 42 });

    const res = await GET(makeRequest(MARCH));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
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
    const year = String(Number(YEAR) - 2);
    const res = await GET(makeRequest({ city_id: validCityId, year, month: "3" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a year after next year", async () => {
    const year = String(Number(YEAR) + 2);
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

  it("returns 200 with jadwal array on success", async () => {
    const date = `${YEAR}-03-01`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUpstreamSuccess(date)),
      })
    );

    const res = await GET(makeRequest(MARCH));
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
        status: 200,
        json: () => Promise.resolve(mockUpstreamSuccess(date)),
      })
    );

    const res = await GET(makeRequest(MARCH));
    const json = await res.json();
    const firstDay = json.data.jadwal[0];
    expect(firstDay.date).toBe(`${YEAR}-03-01`);
    expect(firstDay.imsak).toBe("04:30");
    expect(firstDay.tanggal).toBe(`Minggu, 01/03/${YEAR}`);
  });

  describe("upstream calls", () => {
    const day = (date: string) => ({
      tanggal: `X, ${date}`, imsak: "04:30", subuh: "04:40", terbit: "05:50", dhuha: "06:15",
      dzuhur: "12:00", ashar: "15:15", maghrib: "18:05", isya: "19:15",
    });
    // March always has 31 days
    const marchDates = Array.from({ length: 31 }, (_, i) => `${YEAR}-03-${String(i + 1).padStart(2, "0")}`);

    type Reply = { ok: boolean; status: number; json: () => Promise<unknown> };
    const json = (status: number, body: unknown): Reply => ({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
    const upstream = (dates: string[], edit: (d: ReturnType<typeof day>, date: string) => object = (d) => d) =>
      json(200, {
        status: true,
        data: { kabko: "KOTA JAKARTA", prov: "DKI JAKARTA", jadwal: Object.fromEntries(dates.map((d) => [d, edit(day(d), d)])) },
      });
    /** fetch mock answering by period: "YYYY-MM" (month) or "YYYY-MM-DD" (day) */
    function routeFetch(answer: (period: string, init: RequestInit) => Reply | Promise<Reply>) {
      const mock = vi.fn(async (url: string, init: RequestInit) => answer(url.split("/").pop()!, init));
      vi.stubGlobal("fetch", mock);
      return mock;
    }
    const periods = (mock: ReturnType<typeof routeFetch>) => mock.mock.calls.map(([url]) => url.split("/").pop());

    describe("monthly endpoint", () => {
      it("uses a single upstream call when the monthly endpoint returns the full month", async () => {
        const mockFetch = routeFetch(() => upstream(marchDates));

        const res = await GET(makeRequest(MARCH));
        const body = await res.json();
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch.mock.calls[0][0]).toMatch(new RegExp(`/jadwal/${validCityId}/${YEAR}-03$`));
        expect(body.data.jadwal).toHaveLength(31);
        expect(body.partial).toBeUndefined();
        expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
        expect(res.headers.get("Cache-Control")).toContain("stale-if-error");
      });

      it("asks upstream without the Next.js data cache, with a User-Agent and a time limit", async () => {
        const mockFetch = routeFetch(() => upstream(marchDates));
        await GET(makeRequest(MARCH));
        const init = mockFetch.mock.calls[0][1] as RequestInit & { next?: unknown };
        expect(init.cache).toBe("no-store");
        expect(init.next).toBeUndefined();
        expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(/^Si-Imsak\//);
        expect(init.signal).toBeInstanceOf(AbortSignal);
      });

      it("falls back to per-day calls when the monthly endpoint is not supported", async () => {
        const mockFetch = routeFetch((period) =>
          period.length === 7 ? json(404, { status: false }) : upstream([period])
        );

        const res = await GET(makeRequest(MARCH));
        const body = await res.json();
        // 1 monthly call (404, not retried) + a 1-day probe + the other 30 days
        expect(mockFetch).toHaveBeenCalledTimes(32);
        expect(body.data.jadwal).toHaveLength(31);
        expect(res.headers.get("Cache-Control")).toContain("s-maxage");
      });

      it("fetches only the days missing from an incomplete month", async () => {
        const gaps = [`${YEAR}-03-10`, `${YEAR}-03-20`];
        const mockFetch = routeFetch((period) =>
          period.length === 7 ? upstream(marchDates.filter((d) => !gaps.includes(d))) : upstream([period])
        );

        const res = await GET(makeRequest(MARCH));
        const body = await res.json();
        expect(periods(mockFetch).sort()).toEqual([`${YEAR}-03`, ...gaps].sort());
        expect(body.data.jadwal).toHaveLength(31);
        expect(body.partial).toBeUndefined();
      });

      it("re-fetches days whose times aren't HH:MM", async () => {
        const broken: Record<string, object> = {
          [`${YEAR}-03-05`]: { imsak: "4:30" },
          [`${YEAR}-03-06`]: { dzuhur: "--:--" },
          [`${YEAR}-03-07`]: { isya: undefined },
        };
        const mockFetch = routeFetch((period) =>
          period.length === 7
            ? upstream(marchDates, (d, date) => ({ ...d, ...broken[date] }))
            : upstream([period], (d) => ({ ...d, imsak: "04:31" }))
        );

        const res = await GET(makeRequest(MARCH));
        const body = await res.json();
        expect(mockFetch).toHaveBeenCalledTimes(4);
        expect(body.data.jadwal).toHaveLength(31);
        expect(body.data.jadwal[4]).toMatchObject({ date: `${YEAR}-03-05`, imsak: "04:31" });
        expect(body.data.jadwal.every((d: Record<string, string>) => /^\d\d:\d\d$/.test(d.dzuhur))).toBe(true);
      });

      it("marks a month with missing days as partial and uncacheable", async () => {
        const mockFetch = routeFetch((period) =>
          period.length === 7 ? upstream(marchDates.slice(0, 30)) : json(500, {})
        );

        const res = await GET(makeRequest(MARCH));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.partial).toBe(true);
        expect(body.data.jadwal).toHaveLength(30);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        // The missing day was tried twice
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      it("retries a day whose body is not valid JSON", async () => {
        let dayCalls = 0;
        routeFetch((period) => {
          if (period.length === 7) return upstream(marchDates.slice(1));
          dayCalls++;
          if (dayCalls === 1) return { ok: true, status: 200, json: () => Promise.reject(new SyntaxError("bad")) };
          return upstream([period]);
        });

        const res = await GET(makeRequest(MARCH));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.data.jadwal).toHaveLength(31);
      });

      it("returns 404 for a city upstream has no schedule for, after one probe", async () => {
        const mockFetch = routeFetch(() => json(200, { status: false, message: "Data tidak ditemukan" }));

        const res = await GET(makeRequest(MARCH));
        expect(res.status).toBe(404);
        expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=300");
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it("returns what it has when the visitor disconnects mid-way", async () => {
        const visitor = new AbortController();
        routeFetch((period, init) => {
          if (period.length === 7) return upstream(marchDates.slice(0, 29));
          visitor.abort();
          return Promise.reject(init.signal?.reason ?? new DOMException("aborted", "AbortError"));
        });

        const res = await GET(makeRequest(MARCH, visitor.signal));
        const body = await res.json();
        expect(body.partial).toBe(true);
        expect(body.data.jadwal).toHaveLength(29);
      });
    });

    describe("when upstream is down", () => {
      it("gives up after at most 3 upstream calls with a 502 and Retry-After", async () => {
        const mockFetch = routeFetch(() => json(500, {}));

        const res = await GET(makeRequest(MARCH));
        expect(res.status).toBe(502);
        expect(res.headers.get("Retry-After")).toBe("30");
        expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=30");
        // The month twice, then a single day to confirm
        expect(periods(mockFetch)).toEqual([`${YEAR}-03`, `${YEAR}-03`, `${YEAR}-03-01`]);
      });

      it("treats 429, timeouts and broken JSON like an outage", async () => {
        const answers: (() => Reply | Promise<Reply>)[] = [
          () => json(429, {}),
          () => Promise.reject(new DOMException("The operation timed out.", "TimeoutError")),
          () => ({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError("<html>")) }),
        ];
        let call = 0;
        const mockFetch = routeFetch(() => answers[call++]());

        const res = await GET(makeRequest(MARCH));
        expect(res.status).toBe(502);
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      it("answers straight away for 15 s afterwards, then asks upstream again", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        const mockFetch = routeFetch(() => json(503, {}));
        await GET(makeRequest(MARCH));
        expect(mockFetch).toHaveBeenCalledTimes(3);

        vi.setSystemTime(Date.now() + 5_000);
        const fast = await GET(makeRequest({ ...MARCH, month: "4" }));
        expect(fast.status).toBe(502);
        expect(Number(fast.headers.get("Retry-After"))).toBe(10);
        expect(mockFetch).toHaveBeenCalledTimes(3);

        vi.setSystemTime(Date.now() + 11_000);
        mockFetch.mockImplementation(async () => upstream(marchDates));
        const recovered = await GET(makeRequest(MARCH));
        expect(recovered.status).toBe(200);
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });

      it("doesn't blame upstream when the visitor gave up", async () => {
        const mockFetch = routeFetch(() => upstream(marchDates));
        const gone = new AbortController();
        gone.abort();

        const res = await GET(makeRequest(MARCH, gone.signal));
        expect(res.status).toBe(502);
        expect(mockFetch).not.toHaveBeenCalled();

        const next = await GET(makeRequest(MARCH));
        expect(next.status).toBe(200);
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it("writes one JSON log line per request", async () => {
      routeFetch(() => upstream(marchDates));
      await GET(makeRequest(MARCH));

      expect(console.log).toHaveBeenCalledTimes(1);
      const line = JSON.parse(vi.mocked(console.log).mock.calls[0][0] as string);
      expect(line).toMatchObject({
        level: "info", route: "schedule", city: validCityId, month: `${YEAR}-03`, monthly: "ok",
        calls: 1, days: 31, of: 31, status: 200,
      });
      expect(typeof line.ms).toBe("number");
    });
  });
});
