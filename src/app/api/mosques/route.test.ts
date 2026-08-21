// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => false),
  extractClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/mosques", () => ({
  buildOverpassQuery: vi.fn(() => "[out:json];"),
  parseOverpassResponse: vi.fn(() => [
    { id: "node/1", name: "Masjid Test", lat: -6.18, lng: 106.86, distance: 100 },
  ]),
}));

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/mosques");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.mocked((await import("@/lib/rate-limit")).isRateLimited).mockReturnValue(false);
});

describe("GET /api/mosques", () => {
  it("returns 429 when rate limited", async () => {
    const { isRateLimited } = await import("@/lib/rate-limit");
    vi.mocked(isRateLimited).mockReturnValue(true);

    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when lat is missing", async () => {
    const res = await GET(makeRequest({ lng: "106.85" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lng is missing", async () => {
    const res = await GET(makeRequest({ lat: "-6.17" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lat is outside Indonesia bounds (< -11)", async () => {
    const res = await GET(makeRequest({ lat: "-12", lng: "106.85" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lat is outside Indonesia bounds (> 6)", async () => {
    const res = await GET(makeRequest({ lat: "7", lng: "106.85" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lng is outside Indonesia bounds (< 95)", async () => {
    const res = await GET(makeRequest({ lat: "-6.17", lng: "94" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lng is outside Indonesia bounds (> 141)", async () => {
    const res = await GET(makeRequest({ lat: "-6.17", lng: "142" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lat is NaN", async () => {
    const res = await GET(makeRequest({ lat: "abc", lng: "106.85" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when radius is below 100", async () => {
    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85", radius: "50" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when radius is above 10000", async () => {
    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85", radius: "20000" }));
    expect(res.status).toBe(400);
  });

  it("defaults radius to 2000 when not provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ elements: [] }),
      })
    );

    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85" }));
    expect(res.status).toBe(200);
  });

  it("returns 200 with mosque data on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ elements: [] }),
      })
    );

    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe(true);
    expect(json.data).toBeDefined();
  });

  it("returns 502 when all Overpass endpoints fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));

    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85" }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.retryable).toBe(true);
  });

  it("sets Cache-Control header on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ elements: [] }),
      })
    );

    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85" }));
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });
});
