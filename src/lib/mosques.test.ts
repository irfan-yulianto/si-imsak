import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  formatDistance,
  getSearchRadius,
  buildOverpassQuery,
  parseOverpassResponse,
} from "./mosques";

describe("haversineDistance", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistance(-6.17, 106.85, -6.17, 106.85)).toBe(0);
  });

  it("calculates Jakarta to Bandung (~120km)", () => {
    const dist = haversineDistance(-6.17, 106.85, -6.91, 107.61);
    expect(dist).toBeGreaterThan(110000);
    expect(dist).toBeLessThan(130000);
  });

  it("calculates short distance (~100m)", () => {
    // ~100m apart along latitude
    const dist = haversineDistance(-6.17, 106.85, -6.1709, 106.85);
    expect(dist).toBeGreaterThan(80);
    expect(dist).toBeLessThan(120);
  });

  it("is symmetric", () => {
    const a = haversineDistance(-6.17, 106.85, -6.91, 107.61);
    const b = haversineDistance(-6.91, 107.61, -6.17, 106.85);
    expect(a).toBeCloseTo(b, 5);
  });

  it("handles negative latitudes (southern hemisphere)", () => {
    const dist = haversineDistance(-8.65, 115.22, -7.25, 112.75);
    expect(dist).toBeGreaterThan(0);
  });

  it("handles equator crossing", () => {
    // Pontianak (~0 lat) to Jakarta
    const dist = haversineDistance(-0.02, 109.34, -6.17, 106.85);
    expect(dist).toBeGreaterThan(600000);
    expect(dist).toBeLessThan(800000);
  });

  it("handles antimeridian wrap-around correctly", () => {
    // E.g., 179 to -179 is 2 degrees apart
    const dist = haversineDistance(0, 179, 0, -179);
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

describe("getSearchRadius", () => {
  it("returns 2000 for null accuracy", () => {
    expect(getSearchRadius(null)).toBe(2000);
  });

  it("returns 2000 for 0 accuracy", () => {
    expect(getSearchRadius(0)).toBe(2000);
  });

  it("returns 2000 for 100m accuracy", () => {
    expect(getSearchRadius(100)).toBe(2000);
  });

  it("returns 3000 for 101m accuracy", () => {
    expect(getSearchRadius(101)).toBe(3000);
  });

  it("returns 3000 for 500m accuracy", () => {
    expect(getSearchRadius(500)).toBe(3000);
  });

  it("returns 4000 for 501m accuracy", () => {
    expect(getSearchRadius(501)).toBe(4000);
  });
});

describe("buildOverpassQuery", () => {
  it("contains json output and timeout", () => {
    const query = buildOverpassQuery(-6.17, 106.85, 2000);
    expect(query).toContain("[out:json][timeout:15]");
  });

  it("contains all 3 tag patterns", () => {
    const query = buildOverpassQuery(-6.17, 106.85, 2000);
    expect(query).toContain('"amenity"="place_of_worship"');
    expect(query).toContain('"building"="mosque"');
    expect(query).toContain('"place_of_worship"="musalla"');
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

  it("defaults limit to 20", () => {
    const elements = Array.from({ length: 25 }, (_, i) => ({
      type: "node" as const,
      id: i,
      lat: -6.17 + i * 0.001,
      lon: 106.85,
      tags: { name: `Masjid ${i}` },
    }));
    const result = parseOverpassResponse({ elements }, userLat, userLng);
    expect(result).toHaveLength(20);
  });

  it("uses name fallback chain: name > name:id > name:en > old_name", () => {
    const data = {
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
