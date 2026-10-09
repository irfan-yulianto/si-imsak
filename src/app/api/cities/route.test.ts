// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => false),
  extractClientIp: vi.fn(() => "127.0.0.1"),
}));

function makeRequest(query?: string) {
  const url = new URL("http://localhost/api/cities");
  if (query !== undefined) url.searchParams.set("q", query);
  return new NextRequest(url);
}

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.mocked((await import("@/lib/rate-limit")).isRateLimited).mockReturnValue(false);
});

describe("GET /api/cities", () => {
  it("returns 429 when rate limited", async () => {
    const { isRateLimited } = await import("@/lib/rate-limit");
    vi.mocked(isRateLimited).mockReturnValue(true);

    const res = await GET(makeRequest("jakarta"));
    expect(res.status).toBe(429);
  });

  it("returns empty data when query is missing", async () => {
    const res = await GET(makeRequest());
    const json = await res.json();
    expect(json.status).toBe(false);
    expect(json.data).toEqual([]);
  });

  it("returns empty data when query is too short", async () => {
    const res = await GET(makeRequest("a"));
    const json = await res.json();
    expect(json.status).toBe(false);
    expect(json.data).toEqual([]);
  });

  it("sanitizes query by removing special characters", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: true, data: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await GET(makeRequest("jakarta123!@#"));
    // "jakarta123!@#" -> sanitized to "jakarta" (numbers and specials removed)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("jakarta"),
      expect.any(Object)
    );
  });

  it("returns empty data when sanitized query is too short", async () => {
    // "12" sanitizes to "" (all digits removed)
    const res = await GET(makeRequest("12"));
    const json = await res.json();
    expect(json.status).toBe(false);
    expect(json.data).toEqual([]);
  });

  it("returns empty data with status true when upstream returns 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    );

    const res = await GET(makeRequest("xyznotfound"));
    const json = await res.json();
    expect(json.status).toBe(true);
    expect(json.data).toEqual([]);
  });

  it("returns 502 when upstream returns non-ok, non-404 status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );

    const res = await GET(makeRequest("jakarta"));
    expect(res.status).toBe(502);
  });

  it("returns an uncached 502 when upstream can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));

    const res = await GET(makeRequest("jakarta"));
    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("asks upstream without the data cache, with a User-Agent and a time limit", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: true, data: [] }) });
    vi.stubGlobal("fetch", mockFetch);

    await GET(makeRequest("jakarta"));
    const init = mockFetch.mock.calls[0][1];
    expect(init.cache).toBe("no-store");
    expect(init.next).toBeUndefined();
    expect(init.headers["User-Agent"]).toMatch(/^Si-Imsak\//);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("doesn't cache an upstream answer without status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: false, data: [] }) })
    );
    const res = await GET(makeRequest("jakarta"));
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("filters upstream data to only include id, lokasi, daerah", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: true,
            data: [
              {
                id: "58a2fc6ed39fd083f55d4182bf88826d",
                lokasi: "KOTA JAKARTA",
                daerah: "DKI JAKARTA",
                extra_field: "should be removed",
              },
            ],
          }),
      })
    );

    const res = await GET(makeRequest("jakarta"));
    const json = await res.json();
    expect(json.data[0]).toEqual({
      id: "58a2fc6ed39fd083f55d4182bf88826d",
      lokasi: "KOTA JAKARTA",
      daerah: "DKI JAKARTA",
    });
    expect(json.data[0].extra_field).toBeUndefined();
  });

  it("removes entries without a valid id or name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: true,
            data: [
              { id: "", lokasi: "BAD", daerah: "BAD" },
              { id: "1234", lokasi: "OLD NUMERIC ID", daerah: "BAD" },
              { id: "58a2fc6ed39fd083f55d4182bf88826d", lokasi: "", daerah: "NO NAME" },
              { id: "58a2fc6ed39fd083f55d4182bf88826d", lokasi: "GOOD", daerah: "GOOD" },
            ],
          }),
      })
    );

    const res = await GET(makeRequest("test"));
    const json = await res.json();
    expect(json.data).toEqual([{ id: "58a2fc6ed39fd083f55d4182bf88826d", lokasi: "GOOD", daerah: "GOOD" }]);
  });

  it("returns 400 for a query that is too short after sanitizing", async () => {
    const res = await GET(makeRequest("12"));
    expect(res.status).toBe(400);
  });

  it("keeps accented letters in the query", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: true, data: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await GET(makeRequest("Bàli"));
    expect(mockFetch.mock.calls[0][0]).toContain(encodeURIComponent("Bàli"));
  });

  it("sets CDN cache headers on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: true, data: [] }) })
    );
    const res = await GET(makeRequest("jakarta"));
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
  });
});
