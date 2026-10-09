// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { buildIndex, loadMosqueData } from "@/lib/mosque-index";
import type { DatasetRow } from "@/lib/mosque-tsv";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ ok: true })),
}));

vi.mock("@/lib/mosque-index", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mosque-index")>()),
  loadMosqueData: vi.fn(),
}));

/** Places due north of Monas, every `every` meters */
const north = (count: number, every: number): DatasetRow[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `n${i + 1}`,
    lat: -6.1754 + ((i + 1) * every) / 111_195,
    lng: 106.8272,
    type: i % 5 === 4 ? "musholla" : "masjid",
    name: `Masjid ${i + 1}`,
    ...(i === 0 && { street: "Jl. Medan Merdeka" }),
  }));

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/mosques");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

beforeEach(async () => {
  vi.mocked((await import("@/lib/rate-limit")).checkRateLimit).mockReturnValue({ ok: true });
  vi.mocked(loadMosqueData).mockResolvedValue({ index: buildIndex(north(400, 50)), dataDate: "2026-10-06" });
});

describe("GET /api/mosques: requests", () => {
  it("returns 429 when rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(checkRateLimit).mockReturnValue({ ok: false, retryAfterS: 42 });
    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it.each<[Record<string, string>, string]>([
    [{ lng: "106.85" }, "lat missing"],
    [{ lat: "-6.17" }, "lng missing"],
    [{ lat: "-12", lng: "106.85" }, "south of Indonesia"],
    [{ lat: "7", lng: "106.85" }, "north of Indonesia"],
    [{ lat: "-6.17", lng: "94" }, "west of Indonesia"],
    [{ lat: "-6.17", lng: "142" }, "east of Indonesia"],
    [{ lat: "abc", lng: "106.85" }, "not a number"],
    [{ lat: "-6.17", lng: "106.85", radius: "2500" }, "a radius no version sends"],
  ])("returns 400 for %o (%s)", async (params) => {
    const res = await GET(makeRequest(params));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/mosques: answers", () => {
  it("answers the mosques nearest the position rounded to ~1 km, and how far the list is complete", async () => {
    const res = await GET(makeRequest({ lat: "-6.1754", lng: "106.8272" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
    expect(res.headers.get("X-Data-Date")).toBe("2026-10-06");

    const body = await res.json();
    expect(body.meta.center).toEqual({ lat: -6.18, lng: 106.83 });
    expect(body.meta.dataDate).toBe("2026-10-06");
    // Every 50 m: the 100th nearest lies further than 1.5 km, so the answer reaches it
    expect(body.data).toHaveLength(100);
    expect(body.meta.coverage).toBeCloseTo(body.data[99].distance, -1);
    const distances = body.data.map((m: { distance: number }) => m.distance);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(body.data.find((m: { id: string }) => m.id === "n1")).toMatchObject({ name: "Masjid 1", address: "Jl. Medan Merdeka", type: "masjid" });
  });

  it("answers earlier versions, which send a radius, the way they expect", async () => {
    const res = await GET(makeRequest({ lat: "-6.1754", lng: "106.8272", radius: "2000" }));
    const body = await res.json();
    expect(body.meta.center).toEqual({ lat: -6.175, lng: 106.827 });
    // Every 50 m from Monas, ~44 m south of that point: 40 lie within 2 km
    expect(body.data).toHaveLength(40);
    expect(body.data.every((m: { distance: number }) => m.distance <= 2000)).toBe(true);
    expect(body.meta.coverage).toBe(2000);

    // At most 50, as their list expects
    vi.mocked(loadMosqueData).mockResolvedValue({ index: buildIndex(north(400, 10)), dataDate: "" });
    const dense = await (await GET(makeRequest({ lat: "-6.1754", lng: "106.8272", radius: "2000" }))).json();
    expect(dense.data).toHaveLength(50);
  });

  it("says when nothing is near, having looked 25 km around", async () => {
    const res = await GET(makeRequest({ lat: "-8.65", lng: "115.22" }));
    const body = await res.json();
    expect(body).toMatchObject({ status: true, data: [], meta: { coverage: 25_000 } });
  });

  it("answers 503, retryable and not cached, when the dataset can't be read", async () => {
    vi.mocked(loadMosqueData).mockResolvedValue(null);
    const res = await GET(makeRequest({ lat: "-6.17", lng: "106.85" }));
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ status: false, retryable: true });
  });
});
