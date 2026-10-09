import { describe, it, expect } from "vitest";
import { INDONESIA_BOUNDS } from "./constants";
import { compareIds, datasetChanges, datasetProblems, LANDMARKS, parseTsv, toTsv, TSV_HEADER, type DatasetRow } from "./mosque-tsv";

const row = (id: string, overrides: Partial<DatasetRow> = {}): DatasetRow => ({
  id,
  lat: -6.2,
  lng: 106.8,
  type: "masjid",
  name: `Masjid ${id}`,
  ...overrides,
});
/** The landmarks every dataset must hold */
const landmarks = LANDMARKS.map((l, i) => row(`n${900 + i}`, { lat: l.lat, lng: l.lng, name: `Masjid ${l.name.source}` }));

describe("toTsv and parseTsv", () => {
  it("write a header and one sorted line per place, and read them back", () => {
    const rows = [
      row("w5", { name: "Masjid\tAl-Ikhlas\n", street: "Jl. Damai" }),
      row("n12", { lat: -6.123456, lng: 106.654321, type: "musholla", name: "Mushola Nurul Huda" }),
      row("r1"),
      row("n3"),
    ];
    const text = toTsv(rows);
    const lines = text.trimEnd().split("\n");
    expect(lines[0]).toBe(TSV_HEADER);
    expect(lines.slice(1).map((l) => l.split("\t")[0])).toEqual(["n3", "n12", "w5", "r1"]);
    // Whole numbers of 1e-5°; a tab or a line break in a name can't split the row
    expect(lines[2]).toBe("n12\t-612346\t10665432\tmusholla\tMushola Nurul Huda\t");
    expect(lines[3]).toBe("w5\t-620000\t10680000\tmasjid\tMasjid Al-Ikhlas\tJl. Damai");

    const back = parseTsv(text);
    expect(back.map((r) => r.id)).toEqual(["n3", "n12", "w5", "r1"]);
    expect(back[1]).toEqual({ id: "n12", lat: -6.12346, lng: 106.65432, type: "musholla", name: "Mushola Nurul Huda" });
    expect(back[2].street).toBe("Jl. Damai");
  });

  it("refuses a file it can't read", () => {
    expect(() => parseTsv("id\tlat\n")).toThrow(/header/);
    expect(() => parseTsv(`${TSV_HEADER}\nx1\t1\t2\tmasjid\tMasjid\t\n`)).toThrow(/Line 2/);
    expect(() => parseTsv(`${TSV_HEADER}\nn1\t1\t2\tchurch\tGereja\t\n`)).toThrow(/Line 2/);
  });

  it("orders ids by type, then by number", () => {
    expect(["r2", "w10", "n100", "n9", "w9"].sort(compareIds)).toEqual(["n9", "n100", "w9", "w10", "r2"]);
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

  it("names repeated ids, places outside Indonesia and missing landmarks", () => {
    const problems = datasetProblems([...landmarks.slice(1), row("n1"), row("n1"), row("n2", { lat: 1.35, lng: 103.8 + 50 })], opts);
    expect(problems).toContain("n1 appears twice");
    expect(problems.some((p) => p.startsWith("n2 lies outside Indonesia"))).toBe(true);
    expect(problems).toContain("No istiqlal mosque near Jakarta");
  });

  it("refuses a count that moved more than 5% in a week", () => {
    const rows = [...landmarks, ...Array.from({ length: 97 }, (_, i) => row(`n${i}`))];
    expect(datasetProblems(rows, { ...opts, previousCount: 98 })).toEqual([]);
    expect(datasetProblems(rows, { ...opts, previousCount: 120 })[0]).toMatch(/-16\.7% from 120/);
  });
});
