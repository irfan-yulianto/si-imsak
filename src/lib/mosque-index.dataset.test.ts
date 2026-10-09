// @vitest-environment node
// The committed dataset itself (data/mosques.tsv): it loads quickly enough for a cold
// start, and finds each landmark where it stands.
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { buildIndex } from "./mosque-index";
import { LANDMARKS, parseTsv } from "./mosque-tsv";

const FILE = path.join(process.cwd(), "data", "mosques.tsv");

describe.skipIf(!fs.existsSync(FILE))("data/mosques.tsv", () => {
  it("loads in well under a second, and finds each landmark at its place", () => {
    const start = performance.now();
    const index = buildIndex(parseTsv(fs.readFileSync(FILE, "utf8")));
    expect(performance.now() - start).toBeLessThan(1000);
    expect(index.size).toBeGreaterThan(50_000);

    for (const landmark of LANDMARKS) {
      const { mosques, coverage } = index.nearest(landmark.lat, landmark.lng);
      expect(mosques.slice(0, 3).some((m) => landmark.name.test(m.name)), landmark.where).toBe(true);
      expect(coverage).toBeGreaterThanOrEqual(1500);
    }
  });
});
