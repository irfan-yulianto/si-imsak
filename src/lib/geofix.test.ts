import { describe, it, expect } from "vitest";
import { atPlace, betterFix, freshFix, FRESH_MS } from "./geofix";
import type { GeoFix } from "@/types";

const NOW = 1_760_000_000_000;
/** A fix `north` meters north of a point in Jakarta, taken `age` ms before NOW */
const fix = (accuracy: number, north = 0, age = 0): GeoFix => ({
  lat: -6.2 + north / 111_200,
  lng: 106.8,
  accuracy,
  at: NOW - age,
});

describe("betterFix", () => {
  it("takes the first fix, a sharper one, and one as sharp", () => {
    expect(betterFix(null, fix(800))).toBe(true);
    expect(betterFix(fix(800), fix(120))).toBe(true);
    expect(betterFix(fix(120), fix(120))).toBe(true);
  });

  it("ignores a rougher reading of the same spot", () => {
    expect(betterFix(fix(80), fix(100, 100))).toBe(false);
  });

  it("takes a rougher reading from clearly elsewhere: the user moved", () => {
    // 1 km away is more than both accuracies together
    expect(betterFix(fix(80), fix(100, 1000))).toBe(true);
  });
});

describe("atPlace", () => {
  it("is within 30 m of the wall, or the fix's own accuracy, from a sharp fix only", () => {
    expect(atPlace(0, 10)).toBe(true);
    expect(atPlace(30, 10)).toBe(true);
    expect(atPlace(31, 10)).toBe(false);
    expect(atPlace(45, 50)).toBe(true);
    expect(atPlace(0, 80)).toBe(false);
  });
});

describe("freshFix", () => {
  it("keeps a fix younger than two minutes, and drops an older one", () => {
    expect(freshFix(null, NOW)).toBeNull();
    const fresh = fix(20, 0, FRESH_MS - 1);
    expect(freshFix(fresh, NOW)).toBe(fresh);
    expect(freshFix(fix(20, 0, FRESH_MS), NOW)).toBeNull();
  });
});
