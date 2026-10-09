// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ ok: true })),
}));

// Nominatim's one-request-a-second gate is tested in lib/http.test.ts
vi.mock("@/lib/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/http")>()),
  createGate: () => () => Promise.resolve(),
}));

vi.mock("@/lib/geocode", () => ({
  extractCityFromNominatim: vi.fn(() => "Kabupaten Gresik"),
  normalizeToMyquranName: vi.fn(() => "KAB. GRESIK"),
}));

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/geocode");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const mockFetch = vi.fn();

beforeEach(async () => {
  // Stubbed per test: globals are restored before every test (vitest.config.ts)
  vi.stubGlobal("fetch", mockFetch);
  const rl = await import("@/lib/rate-limit");
  vi.mocked(rl.checkRateLimit).mockReturnValue({ ok: true });
  const geo = await import("@/lib/geocode");
  vi.mocked(geo.extractCityFromNominatim).mockReturnValue("Kabupaten Gresik");
  vi.mocked(geo.normalizeToMyquranName).mockReturnValue("KAB. GRESIK");
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ address: { county: "Kabupaten Gresik", state: "Jawa Timur" } }),
  });
});

describe("GET /api/geocode", () => {
  it("returns 429 when rate limited", async () => {
    const rl = await import("@/lib/rate-limit");
    vi.mocked(rl.checkRateLimit).mockReturnValue({ ok: false, retryAfterS: 42 });
    const res = await GET(makeRequest({ lat: "-7.25", lng: "112.43" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("returns 400 when lat is missing", async () => {
    const res = await GET(makeRequest({ lng: "112.43" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lng is missing", async () => {
    const res = await GET(makeRequest({ lat: "-7.25" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for out-of-bounds latitude", async () => {
    const res = await GET(makeRequest({ lat: "50", lng: "112.43" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for out-of-bounds longitude", async () => {
    const res = await GET(makeRequest({ lat: "-7.25", lng: "200" }));
    expect(res.status).toBe(400);
  });

  it("returns city on successful Nominatim response", async () => {
    const res = await GET(makeRequest({ lat: "-7.25", lng: "112.43" }));
    const json = await res.json();
    expect(json.status).toBe(true);
    expect(json.city).toBe("KAB. GRESIK");
  });

  it("calls Nominatim with correct params", async () => {
    await GET(makeRequest({ lat: "-7.25", lng: "112.43" }));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("lat=-7.25&lon=112.43"),
      expect.objectContaining({
        headers: expect.objectContaining({ "User-Agent": expect.stringContaining("Si-Imsak") }),
      })
    );
  });

  it("returns 502 with status false when Nominatim returns non-ok", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    const res = await GET(makeRequest({ lat: "-7.25", lng: "112.43" }));
    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = await res.json();
    expect(json.status).toBe(false);
    expect(json.city).toBe("");
  });

  it("returns 502 with status false on fetch error (timeout)", async () => {
    mockFetch.mockRejectedValue(new Error("AbortError"));
    const res = await GET(makeRequest({ lat: "-7.25", lng: "112.43" }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.status).toBe(false);
    expect(json.city).toBe("");
  });

  it("returns status false when no city extracted", async () => {
    const geo = await import("@/lib/geocode");
    vi.mocked(geo.extractCityFromNominatim).mockReturnValue("");
    const res = await GET(makeRequest({ lat: "-7.25", lng: "112.43" }));
    const json = await res.json();
    expect(json.status).toBe(false);
  });

  it("sends Nominatim the position to ~1 km only (2 decimals) and sets CDN cache headers", async () => {
    const res = await GET(makeRequest({ lat: "-7.251234", lng: "112.438765" }));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("lat=-7.25&lon=112.44"),
      expect.any(Object)
    );
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
  });
});
