import {
  distanceMeters,
  formatDistance,
  formatRadius,
  sortByDistance,
  visibleMosques,
  needsSearch,
  type MosqueAnswer,
} from "./mosques";
import type { Mosque } from "@/types";

describe("distanceMeters", () => {
  it("returns 0 for identical coordinates", () => {
    expect(distanceMeters(-6.17, 106.85, -6.17, 106.85)).toBe(0);
  });

  it("calculates Jakarta to Bandung (~120km)", () => {
    const dist = distanceMeters(-6.17, 106.85, -6.91, 107.61);
    expect(dist).toBeGreaterThan(110000);
    expect(dist).toBeLessThan(130000);
  });

  it("calculates short distance (~100m)", () => {
    // ~100m apart along latitude
    const dist = distanceMeters(-6.17, 106.85, -6.1709, 106.85);
    expect(dist).toBeGreaterThan(80);
    expect(dist).toBeLessThan(120);
  });

  it("is symmetric", () => {
    const a = distanceMeters(-6.17, 106.85, -6.91, 107.61);
    const b = distanceMeters(-6.91, 107.61, -6.17, 106.85);
    expect(a).toBeCloseTo(b, 5);
  });

  it("handles negative latitudes (southern hemisphere)", () => {
    const dist = distanceMeters(-8.65, 115.22, -7.25, 112.75);
    expect(dist).toBeGreaterThan(0);
  });

  it("handles equator crossing", () => {
    // Pontianak (~0 lat) to Jakarta
    const dist = distanceMeters(-0.02, 109.34, -6.17, 106.85);
    expect(dist).toBeGreaterThan(600000);
    expect(dist).toBeLessThan(800000);
  });

  it("handles antimeridian wrap-around correctly", () => {
    // E.g., 179 to -179 is 2 degrees apart
    const dist = distanceMeters(0, 179, 0, -179);
    expect(dist).toBeGreaterThan(200000);
    expect(dist).toBeLessThan(250000);
  });
});

describe("formatDistance", () => {
  it("formats meters under 1000", () => {
    expect(formatDistance(500)).toBe("500 m");
  });

  it("formats 999m", () => {
    expect(formatDistance(999)).toBe("999 m");
  });

  it("formats exactly 1000m", () => {
    expect(formatDistance(1000)).toBe("1.0 km");
  });

  it("formats 1500m", () => {
    expect(formatDistance(1500)).toBe("1.5 km");
  });

  it("formats 0m", () => {
    expect(formatDistance(0)).toBe("0 m");
  });

  it("formats large distance", () => {
    expect(formatDistance(10000)).toBe("10.0 km");
  });
});

describe("formatRadius", () => {
  it("shows meters below 1 km and kilometers, to a tenth, from there", () => {
    expect(formatRadius(800)).toBe("800 m");
    expect(formatRadius(2000)).toBe("2 km");
    expect(formatRadius(2500)).toBe("2.5 km");
    expect(formatRadius(25_000)).toBe("25 km");
    expect(formatRadius(1834.6)).toBe("1.8 km");
  });
});

const mosqueAt = (id: string, lat: number, lng: number, distance = 0): Mosque => ({
  id,
  name: `Masjid ${id}`,
  lat,
  lng,
  distance,
  type: "masjid",
});

describe("sortByDistance", () => {
  it("measures again from the given place, nearest first", () => {
    const far = mosqueAt("far", -6.2, 106.81, 5);
    const near = mosqueAt("near", -6.2, 106.801, 900);
    const sorted = sortByDistance([far, near], { lat: -6.2, lng: 106.8 });
    expect(sorted.map((m) => m.id)).toEqual(["near", "far"]);
    expect(sorted[0].distance).toBeCloseTo(110.6, 0);
  });
});

describe("visibleMosques and needsSearch", () => {
  const center = { lat: -6.2, lng: 106.8 };
  // Ten mosques due north, every ~111 m from the center
  const tenNorth = Array.from({ length: 10 }, (_, i) =>
    mosqueAt(`n${i}`, -6.2 + (i + 1) * 0.001, 106.8, (i + 1) * 111.2)
  );
  const answer = (mosques: Mosque[], coverage: number): MosqueAnswer => ({ center, coverage, mosques });
  const south = (meters: number) => ({ lat: -6.2 - meters / 111_200, lng: 106.8 });

  it("shows the whole answer from where it searched, nearest first", () => {
    const shown = visibleMosques(answer(tenNorth, 2000), center);
    expect(shown.map((m) => m.id)).toEqual(tenNorth.map((m) => m.id));
    expect(needsSearch(answer(tenNorth, 2000), center)).toBe(false);
  });

  it("shows only the mosques surely nearest from a position away from the search", () => {
    // The answer is complete to 1,112 m from the center (cut at the 10th). From 500 m
    // south, only what lies within 612 m is sure: nearer mosques the search didn't
    // reach could lie beyond its edge
    const cut = answer(tenNorth, 1112);
    const shown = visibleMosques(cut, south(500));
    expect(shown.map((m) => m.id)).toEqual(["n0"]);
    expect(needsSearch(cut, south(500))).toBe(true);
    // From 100 m south, eight are sure: no new search
    expect(visibleMosques(cut, south(100))).toHaveLength(8);
    expect(needsSearch(cut, south(100))).toBe(false);
  });

  it("needs as many sure results as the answer has, up to five", () => {
    // Both of two found are sure from 100 m south; from 1 km south neither is: a nearer
    // mosque could lie south, outside the 2 km searched
    const two = answer(tenNorth.slice(0, 2), 2000);
    expect(needsSearch(two, south(100))).toBe(false);
    expect(needsSearch(two, south(1000))).toBe(true);
  });

  it("searches again where nothing was found only after moving 200 m", () => {
    const none = answer([], 2000);
    expect(needsSearch(none, south(150))).toBe(false);
    expect(needsSearch(none, south(250))).toBe(true);
  });
});
