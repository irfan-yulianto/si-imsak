import { describe, it, expect } from "vitest";
import { INDONESIA_BOUNDS } from "./constants";
import {
  compareIds,
  countBySource,
  datasetChanges,
  datasetProblems,
  LANDMARKS,
  MAX_HALF_EXTENT_DEG,
  parseTsv,
  sourceOf,
  toTsv,
  TSV_HEADER,
  TSV_HEADER_V1,
  type DatasetRow,
} from "./mosque-tsv";

const row = (id: string, overrides: Partial<DatasetRow> = {}): DatasetRow => ({
  id,
  lat: -6.2,
  lng: 106.8,
  type: "masjid",
  name: `Masjid ${id}`,
  ...overrides,
});
/** Overture's place `n`, by its id ("o" and 32 hex digits) */
const overtureId = (n: number) => `o${n.toString(16).padStart(32, "0")}`;
/** The landmarks every dataset must hold */
const landmarks = LANDMARKS.map((l, i) => row(`n${900 + i}`, { lat: l.lat, lng: l.lng, name: `Masjid ${l.name.source}` }));

describe("toTsv and parseTsv", () => {
  it("write a header and one sorted line per place, and read them back", () => {
    const rows = [
      row("w5", { name: "Masjid\tAl-Ikhlas\n", street: "Jl. Damai", dlat: 0.0004, dlng: 0.0003 }),
      row("n12", { lat: -6.123456, lng: 106.654321, type: "musholla", name: "Mushola Nurul Huda" }),
      row("r1"),
      row(overtureId(10)),
      row("n3"),
    ];
    const text = toTsv(rows);
    const lines = text.trimEnd().split("\n");
    expect(lines[0]).toBe(TSV_HEADER);
    expect(lines.slice(1).map((l) => l.split("\t")[0])).toEqual(["n3", "n12", "w5", "r1", overtureId(10)]);
    // Whole numbers of 1e-5°; a tab or a line break in a name can't split the row; a
    // point has no extent
    expect(lines[2]).toBe("n12\t-612346\t10665432\tmusholla\tMushola Nurul Huda\t\t0\t0");
    expect(lines[3]).toBe("w5\t-620000\t10680000\tmasjid\tMasjid Al-Ikhlas\tJl. Damai\t40\t30");

    const back = parseTsv(text);
    expect(back.map((r) => r.id)).toEqual(["n3", "n12", "w5", "r1", overtureId(10)]);
    expect(back[1]).toEqual({ id: "n12", lat: -6.12346, lng: 106.65432, type: "musholla", name: "Mushola Nurul Huda" });
    expect(back[2]).toMatchObject({ street: "Jl. Damai", dlat: 0.0004, dlng: 0.0003 });
  });

  it("reads a file from before the outlines were stored", () => {
    expect(parseTsv(`${TSV_HEADER_V1}\nn1\t-620000\t10680000\tmasjid\tMasjid\t\n`)).toEqual([
      { id: "n1", lat: -6.2, lng: 106.8, type: "masjid", name: "Masjid" },
    ]);
  });

  it("refuses a file it can't read", () => {
    expect(() => parseTsv("id\tlat\n")).toThrow(/header/);
    expect(() => parseTsv(`${TSV_HEADER}\nx1\t1\t2\tmasjid\tMasjid\t\t0\t0\n`)).toThrow(/Line 2/);
    expect(() => parseTsv(`${TSV_HEADER}\nn1\t1\t2\tchurch\tGereja\t\t0\t0\n`)).toThrow(/Line 2/);
    // Overture's ids have 32 hex digits
    expect(() => parseTsv(`${TSV_HEADER}\no123\t1\t2\tmasjid\tMasjid\t\t0\t0\n`)).toThrow(/Line 2/);
    // An extent is a whole number of 1e-5°, never negative
    expect(() => parseTsv(`${TSV_HEADER}\nn1\t1\t2\tmasjid\tMasjid\t\t-1\t0\n`)).toThrow(/Line 2/);
    expect(() => parseTsv(`${TSV_HEADER}\nn1\t1\t2\tmasjid\tMasjid\t\t0\tx\n`)).toThrow(/Line 2/);
  });

  it("orders OpenStreetMap's ids by type, then by number; Overture's after them", () => {
    expect(["r2", overtureId(11), "w10", "n100", overtureId(2), "n9", "w9"].sort(compareIds)).toEqual([
      "n9",
      "n100",
      "w9",
      "w10",
      "r2",
      overtureId(2),
      overtureId(11),
    ]);
  });

  it("tells each row's source by its id", () => {
    expect(sourceOf("w5")).toBe("openstreetmap");
    expect(sourceOf(overtureId(1))).toBe("overture");
    expect(countBySource([row("n1"), row("r2"), row(overtureId(3))])).toEqual({ openstreetmap: 2, overture: 1 });
  });
});

describe("datasetChanges", () => {
  it("counts the places added, removed and changed", () => {
    const before = [row("n1"), row("n2"), row("n3")];
    const after = [row("n1"), row("n2", { name: "Masjid Baru" }), row("n4"), row("n5")];
    expect(datasetChanges(before, after)).toEqual({ added: 2, removed: 1, changed: 1 });
  });
});

describe("datasetProblems", () => {
  const opts = { bounds: INDONESIA_BOUNDS };

  it("accepts a sound dataset", () => {
    expect(datasetProblems([...landmarks, row("n1")], opts)).toEqual([]);
  });

  it("names repeated ids, places outside Indonesia, outlines wider than a building, and missing landmarks", () => {
    const wide = row("w9", { dlat: MAX_HALF_EXTENT_DEG + 0.001, dlng: 0.001 });
    const problems = datasetProblems([...landmarks.slice(1), row("n1"), row("n1"), row("n2", { lat: 1.35, lng: 103.8 + 50 }), wide], opts);
    expect(problems).toContain("n1 appears twice");
    expect(problems.some((p) => p.startsWith("n2 lies outside Indonesia"))).toBe(true);
    expect(problems).toContain("w9 spans more than 0.005° (0.006, 0.001)");
    expect(problems).toContain("No istiqlal mosque near Jakarta");
    expect(datasetProblems([...landmarks, row("w9", { dlat: MAX_HALF_EXTENT_DEG, dlng: 0.001 })], opts)).toEqual([]);
  });

  it("refuses an OpenStreetMap count that moved more than 5% in a week", () => {
    const rows = [...landmarks, ...Array.from({ length: 97 }, (_, i) => row(`n${i}`))];
    expect(datasetProblems(rows, { ...opts, previous: { openstreetmap: 98, overture: 0 } })).toEqual([]);
    expect(datasetProblems(rows, { ...opts, previous: { openstreetmap: 120, overture: 0 } })[0]).toMatch(
      /100 places from openstreetmap, -16\.7% from 120/
    );
  });

  it("allows Overture's count 10%, and compares it only once the dataset had Overture", () => {
    const osm = [...landmarks, ...Array.from({ length: 97 }, (_, i) => row(`n${i}`))];
    const rows = [...osm, ...Array.from({ length: 46 }, (_, i) => row(overtureId(i)))];
    // The first dataset with Overture
    expect(datasetProblems(rows, { ...opts, previous: { openstreetmap: 100, overture: 0 } })).toEqual([]);
    expect(datasetProblems(rows, { ...opts, previous: { openstreetmap: 100, overture: 50 } })).toEqual([]);
    // A download that failed would leave none
    expect(datasetProblems(osm, { ...opts, previous: { openstreetmap: 100, overture: 50 } })).toEqual([
      "0 places from overture, -100.0% from 50: more than 10%",
    ]);
  });
});
