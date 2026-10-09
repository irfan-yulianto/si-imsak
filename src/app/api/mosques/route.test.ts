// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ ok: true })),
}));

vi.mock("@/lib/mosques", async (importOriginal) => ({
  SEARCH_RADII: (await importOriginal<typeof import("@/lib/mosques")>()).SEARCH_RADII,
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
  vi.mocked((await import("@/lib/rate-limit")).checkRateLimit).mockReturnValue({ ok: true });
});

describe("GET /api/mosques", () => {
  it("returns 429 when rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(checkRateLimit).mockReturnValue({ ok: false, retryAfterS: 42 });

    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
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

  it("returns 200 when one endpoint succeeds and others fail", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ elements: [] }),
        });
      }
      return Promise.reject(new Error("timeout"));
    }));

    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe(true);
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

describe("GET /api/mosques: radius and mirrors", () => {
  const answer = () => ({ ok: true, json: () => Promise.resolve({ elements: [] }) });

  it("accepts only the radii the finder asks for", async () => {
    for (const radius of ["2500", "100", "5000"]) {
      const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85", radius }));
      expect(res.status).toBe(400);
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer()));
    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85", radius: "6000" }));
    expect(res.status).toBe(200);
  });

  it("asks one mirror first, the next only after 3 s without an answer, and cancels the loser", async () => {
    vi.useFakeTimers();
    let answerFirst!: (res: unknown) => void;
    let calls = 0;
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<unknown>>(() =>
      ++calls === 1 ? new Promise((resolve) => (answerFirst = resolve)) : new Promise(() => {})
    );
    vi.stubGlobal("fetch", fetchMock);

    const pending = GET(makeRequest({ lat: "-6.17", lng: "106.85" }));
    await vi.advanceTimersByTimeAsync(2_900);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    answerFirst(answer());
    expect((await pending).status).toBe(200);
    expect(fetchMock.mock.calls[1][1].signal!.aborted).toBe(true);
    // No third mirror once there is an answer
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("moves on to the next mirror as soon as one fails", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("HTTP 504")).mockResolvedValueOnce(answer());
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85" }));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
