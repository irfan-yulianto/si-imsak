import { describe, it, expect } from "vitest";
import {
  distanceMeters,
  formatDistance,
  DEFAULT_RADIUS,
  widerRadius,
  formatRadius,
  SEARCH_RADII,
  RESULT_LIMIT,
  buildOverpassQuery,
  parseOverpassResponse,
  sortByDistance,
  coverageOf,
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

describe("widerRadius", () => {
  it("doubles the radius up to 10 km", () => {
    expect(widerRadius(2000)).toBe(4000);
    expect(widerRadius(3000)).toBe(6000);
    expect(widerRadius(8000)).toBe(10000);
    expect(widerRadius(10000)).toBe(10000);
  });
});

describe("SEARCH_RADII", () => {
  it("holds every radius the finder can ask for, and those earlier versions asked for", () => {
    const asked = new Set<number>();
    // Earlier versions started at 2, 3 or 4 km, depending on the GPS accuracy
    for (const start of [DEFAULT_RADIUS, 3000, 4000]) {
      let radius = start;
      for (let i = 0; i < 5; i++, radius = widerRadius(radius)) asked.add(radius);
    }
    for (const radius of asked) expect(SEARCH_RADII).toContain(radius);
  });
});

describe("formatRadius", () => {
  it("shows meters below 1 km and kilometers from there", () => {
    expect(formatRadius(800)).toBe("800 m");
    expect(formatRadius(2000)).toBe("2 km");
    expect(formatRadius(2500)).toBe("2.5 km");
  });
});

describe("buildOverpassQuery", () => {
  it("contains json output and timeout", () => {
    const query = buildOverpassQuery(-6.17, 106.85, 2000);
    expect(query).toContain("[out:json][timeout:8]");
  });

  it("asks for nodes, ways and relations in every way a mosque or musholla is mapped", () => {
    const query = buildOverpassQuery(-6.17, 106.85, 2000);
    expect(query).toContain('nwr["amenity"="place_of_worship"]["religion"~"^(muslim|islam)$"]');
    // A place of worship without a religion, named like a masjid or a musholla
    expect(query).toContain('nwr["amenity"="place_of_worship"][!"religion"]["name"~"^(m[ae]sjid|mu(s|sh)[oa]l|langgar|surau|meunasah|tajug)",i]');
    expect(query).toContain('nwr["building"~"^(mosque|musalla)$"]');
    expect(query).toContain('nwr["place_of_worship"~"^(musall?a|mushall?a|mush?oll?a)$"]');
    expect(query).not.toMatch(/\bnw\[/);
  });

  it("interpolates coordinates and radius", () => {
    const query = buildOverpassQuery(-6.17, 106.85, 3000);
    expect(query).toContain("around:3000,-6.17,106.85");
  });

  it("ends with out center body qt", () => {
    const query = buildOverpassQuery(-6.17, 106.85, 2000);
    expect(query).toContain("out center body qt;");
  });
});

describe("parseOverpassResponse", () => {
  const userLat = -6.17;
  const userLng = 106.85;

  it("returns empty array for null-ish data", () => {
    expect(parseOverpassResponse(null as never, userLat, userLng)).toEqual([]);
    expect(parseOverpassResponse({} as never, userLat, userLng)).toEqual([]);
    expect(parseOverpassResponse({ elements: [] }, userLat, userLng)).toEqual([]);
  });

  it("parses node elements correctly", () => {
    const data = {
      elements: [
        { type: "node" as const, id: 1, lat: -6.18, lon: 106.86, tags: { name: "Masjid Al-Amin" } },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Masjid Al-Amin");
    expect(result[0].lat).toBe(-6.18);
    expect(result[0].lng).toBe(106.86);
    expect(result[0].distance).toBeGreaterThan(0);
  });

  it("parses way elements using center", () => {
    const data = {
      elements: [
        { type: "way" as const, id: 2, center: { lat: -6.18, lon: 106.86 }, tags: { name: "Masjid B" } },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result).toHaveLength(1);
    expect(result[0].lat).toBe(-6.18);
  });

  it("parses relation elements using center", () => {
    const data = {
      elements: [
        { type: "relation" as const, id: 3, center: { lat: -6.19, lon: 106.87 }, tags: { name: "Masjid C" } },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result).toHaveLength(1);
  });

  it("deduplicates by type/id", () => {
    const data = {
      elements: [
        { type: "node" as const, id: 1, lat: -6.18, lon: 106.86, tags: { name: "Masjid A" } },
        { type: "node" as const, id: 1, lat: -6.18, lon: 106.86, tags: { name: "Masjid A" } },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result).toHaveLength(1);
  });

  it("sorts by distance ascending", () => {
    const data = {
      elements: [
        { type: "node" as const, id: 1, lat: -6.20, lon: 106.90, tags: { name: "Far" } },
        { type: "node" as const, id: 2, lat: -6.171, lon: 106.851, tags: { name: "Near" } },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result[0].name).toBe("Near");
    expect(result[1].name).toBe("Far");
  });

  it("respects limit parameter", () => {
    const elements = Array.from({ length: 30 }, (_, i) => ({
      type: "node" as const,
      id: i,
      lat: -6.17 + i * 0.001,
      lon: 106.85,
      tags: { name: `Masjid ${i}` },
    }));
    const result = parseOverpassResponse({ elements }, userLat, userLng, 5);
    expect(result).toHaveLength(5);
  });

  it("defaults limit to 50", () => {
    const elements = Array.from({ length: 60 }, (_, i) => ({
      type: "node" as const,
      id: i,
      lat: -6.17 + i * 0.001,
      lon: 106.85,
      tags: { name: `Masjid ${i}` },
    }));
    const result = parseOverpassResponse({ elements }, userLat, userLng);
    expect(result).toHaveLength(RESULT_LIMIT);
    expect(RESULT_LIMIT).toBe(50);
  });

  it("knows a musholla by its name as well as by its tags", () => {
    const data: Parameters<typeof parseOverpassResponse>[0] = {
      elements: [
        { type: "node" as const, id: 1, lat: -6.171, lon: 106.85, tags: { amenity: "place_of_worship", religion: "muslim", name: "Mushola Al-Ikhlas" } },
        { type: "node" as const, id: 2, lat: -6.172, lon: 106.85, tags: { amenity: "place_of_worship", name: "Langgar Kidul" } },
        { type: "node" as const, id: 3, lat: -6.173, lon: 106.85, tags: { amenity: "place_of_worship", religion: "islam", name: "Masjid Al-Amin" } },
      ],
    };
    expect(parseOverpassResponse(data, userLat, userLng).map((m) => m.type)).toEqual(["musholla", "musholla", "masjid"]);
  });

  it("lists a mosque mapped as a point and as its building once, with the fuller entry", () => {
    const data: Parameters<typeof parseOverpassResponse>[0] = {
      elements: [
        { type: "way" as const, id: 20, center: { lat: -6.1803, lon: 106.8601 }, tags: { building: "mosque" } },
        { type: "way" as const, id: 21, center: { lat: -6.1801, lon: 106.86 }, tags: { building: "mosque", name: "Masjid Al-Ikhlas" } },
        {
          type: "node" as const,
          id: 10,
          lat: -6.18,
          lon: 106.86,
          tags: { amenity: "place_of_worship", religion: "muslim", name: "Masjid Al-Ikhlas", "addr:street": "Jl. Damai" },
        },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "node/10", name: "Masjid Al-Ikhlas", address: "Jl. Damai" });
  });

  it("uses name fallback chain: name > name:id > name:en > old_name", () => {
    const data: Parameters<typeof parseOverpassResponse>[0] = {
      elements: [
        { type: "node" as const, id: 1, lat: -6.18, lon: 106.86, tags: { "name:id": "Masjid Indo" } },
        { type: "node" as const, id: 2, lat: -6.18, lon: 106.86, tags: { "name:en": "English Mosque" } },
        { type: "node" as const, id: 3, lat: -6.18, lon: 106.86, tags: { old_name: "Old Mosque" } },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result.find((m) => m.id === "node/1")?.name).toBe("Masjid Indo");
    expect(result.find((m) => m.id === "node/2")?.name).toBe("English Mosque");
    expect(result.find((m) => m.id === "node/3")?.name).toBe("Old Mosque");
  });

  it("defaults to 'Masjid' when no name tags", () => {
    const data = {
      elements: [
        { type: "node" as const, id: 1, lat: -6.18, lon: 106.86, tags: { amenity: "place_of_worship" } },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result[0].name).toBe("Masjid");
  });

  it("returns 'Musholla' for musalla with no name", () => {
    const data = {
      elements: [
        { type: "node" as const, id: 1, lat: -6.18, lon: 106.86, tags: { place_of_worship: "musalla" } },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result[0].name).toBe("Musholla");
  });

  it("appends address when name is just 'Masjid'", () => {
    const data = {
      elements: [
        {
          type: "node" as const,
          id: 1,
          lat: -6.18,
          lon: 106.86,
          tags: { name: "Masjid", "addr:street": "Jl. Merdeka" },
        },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result[0].name).toBe("Masjid (Jl. Merdeka)");
  });

  it("skips elements with no extractable center", () => {
    const data = {
      elements: [
        { type: "way" as const, id: 1, tags: { name: "No Center" } },
        { type: "node" as const, id: 2, lat: -6.18, lon: 106.86, tags: { name: "Has Center" } },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Has Center");
  });

  it("extracts address from addr:street or addr:full", () => {
    const data = {
      elements: [
        {
          type: "node" as const,
          id: 1,
          lat: -6.18,
          lon: 106.86,
          tags: { name: "Masjid X", "addr:full": "Jl. Sudirman No.1" },
        },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result[0].address).toBe("Jl. Sudirman No.1");
  });

  it("handles elements with no tags", () => {
    const data = {
      elements: [
        { type: "node" as const, id: 1, lat: -6.18, lon: 106.86 },
      ],
    };
    const result = parseOverpassResponse(data, userLat, userLng);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Masjid");
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

describe("coverageOf", () => {
  it("is the whole radius unless the list was cut at the limit", () => {
    const list = [mosqueAt("a", 0, 0, 100), mosqueAt("b", 0, 0, 700)];
    expect(coverageOf(list, 2000)).toBe(2000);
    expect(coverageOf(list, 2000, 2)).toBe(700);
  });
});

describe("visibleMosques and needsSearch", () => {
  const center = { lat: -6.2, lng: 106.8 };
  // Ten mosques due north, every ~111 m from the center
  const tenNorth = Array.from({ length: 10 }, (_, i) =>
    mosqueAt(`n${i}`, -6.2 + (i + 1) * 0.001, 106.8, (i + 1) * 111.2)
  );
  const answer = (mosques: Mosque[], coverage: number): MosqueAnswer => ({ center, radius: 2000, coverage, mosques });
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
