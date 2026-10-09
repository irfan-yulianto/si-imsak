// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { buildIndex, loadMosqueData } from "./mosque-index";
import { distanceMeters } from "./mosque-osm";
import { toTsv, type DatasetRow } from "./mosque-tsv";

/** The same numbers on every run */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
    return seed / 2 ** 31;
  };
}

/** `count` places scattered over a square of `spanDeg` degrees around a point */
function scatter(count: number, center: { lat: number; lng: number }, spanDeg: number, seed = 1): DatasetRow[] {
  const random = seeded(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: `n${i}`,
    lat: center.lat + (random() - 0.5) * spanDeg,
    lng: center.lng + (random() - 0.5) * spanDeg,
    type: i % 4 === 0 ? "musholla" : "masjid",
    name: `Masjid ${i}`,
  }));
}

/** The answer the index must give, by measuring every place */
function bruteForce(rows: DatasetRow[], lat: number, lng: number, within: number) {
  return rows
    .map((row) => ({ id: row.id, d: distanceMeters(lat, lng, row.lat, row.lng) }))
    .filter((r) => r.d <= within)
    .sort((a, b) => a.d - b.d)
    .map((r) => r.id);
}

const JAKARTA = { lat: -6.2, lng: 106.82 };

describe("buildIndex().nearest", () => {
  it("finds what measuring every place finds, in a dense city", () => {
    const rows = scatter(20_000, JAKARTA, 0.4);
    const index = buildIndex(rows);
    for (const [lat, lng] of [[-6.2, 106.82], [-6.31, 106.7], [-6.05, 106.99]]) {
      const { mosques, coverage } = index.nearest(lat, lng);
      expect(mosques.map((m) => m.id)).toEqual(bruteForce(rows, lat, lng, coverage).slice(0, mosques.length));
      // The list is complete to its coverage
      expect(bruteForce(rows, lat, lng, coverage)).toHaveLength(mosques.length);
    }
  });

  it("reaches at least 1.5 km, or as far as the 100th nearest, and holds at most 300", () => {
    // ~125 places per km²: 100 lie within ~500 m, and more than 300 within 1.5 km
    const dense = buildIndex(scatter(20_000, JAKARTA, 0.12));
    const near = dense.nearest(JAKARTA.lat, JAKARTA.lng);
    expect(near.mosques).toHaveLength(300);
    expect(near.coverage).toBe(near.mosques[299].distance);
    expect(near.coverage).toBeLessThan(1500);

    // Sparse: 100 places over ~1,100 km², all within 25 km: the answer reaches to the 100th
    const sparse = buildIndex(scatter(100, JAKARTA, 0.3, 7));
    const far = sparse.nearest(JAKARTA.lat, JAKARTA.lng);
    expect(far.mosques).toHaveLength(100);
    expect(far.coverage).toBeCloseTo(far.mosques[99].distance, 6);
    expect(far.coverage).toBeGreaterThan(1500);
  });

  it("gives up at 25 km, saying it looked that far", () => {
    const lonely = buildIndex([{ id: "n1", lat: -6.2, lng: 106.82, type: "masjid", name: "Masjid Sepi" }]);
    expect(lonely.nearest(-6.2, 107.1)).toEqual({ mosques: [], coverage: 25_000 });
    const found = lonely.nearest(-6.2, 106.9);
    expect(found.mosques).toEqual([
      expect.objectContaining({ id: "n1", name: "Masjid Sepi", type: "masjid", distance: expect.closeTo(8_840, -2) }),
    ]);
    expect(found.coverage).toBe(25_000);
  });

  it("answers the old way when asked: within a radius, at most a number", () => {
    const index = buildIndex(scatter(5_000, JAKARTA, 0.2));
    const { mosques, coverage } = index.nearest(JAKARTA.lat, JAKARTA.lng, { minReach: 2000, maxReach: 2000, minCount: 1, maxCount: 50 });
    expect(mosques).toHaveLength(50);
    expect(mosques.every((m) => m.distance <= coverage)).toBe(true);
  });

  it("carries the street as the address", () => {
    const index = buildIndex([{ id: "w7", lat: -6.2, lng: 106.82, type: "musholla", name: "Mushola Al-Amin", street: "Gg. Damai" }]);
    expect(index.nearest(-6.2, 106.82).mosques[0]).toEqual({
      id: "w7",
      name: "Mushola Al-Amin",
      lat: -6.2,
      lng: 106.82,
      distance: 0,
      address: "Gg. Damai",
      type: "musholla",
    });
  });
});

describe("loadMosqueData", () => {
  it("reads the dataset and its date once, and says null when there is none", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mosques-"));
    const file = path.join(dir, "mosques.tsv");
    fs.writeFileSync(file, toTsv(scatter(10, JAKARTA, 0.01)));
    fs.writeFileSync(path.join(dir, "mosques.meta.json"), JSON.stringify({ osmTimestamp: "2026-10-06T20:21:02Z" }));

    const data = await loadMosqueData(file);
    expect(data?.index.size).toBe(10);
    expect(data?.dataDate).toBe("2026-10-06");
    expect(await loadMosqueData(file)).toBe(data);

    expect(await loadMosqueData(path.join(dir, "missing.tsv"))).toBeNull();
  });
});
