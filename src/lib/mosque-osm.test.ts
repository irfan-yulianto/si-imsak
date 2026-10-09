import { describe, it, expect } from "vitest";
import { classifyType, dedupe, displayName, distanceMeters, isIslamicName, normalizeName } from "./mosque-osm";

describe("classifyType", () => {
  it.each([
    "Musholla Al-Ikhlas",
    "Mushola Nurul Huda",
    "Mushollah At-Taqwa",
    "Musala Al-Falah",
    "Musalla Baitul Makmur",
    "Mushalla Darussalam",
    "MUSHOLA AL-AMIN",
    "Musholā Al-Hidayah",
    "Langgar Kidul",
    "Surau Gadang",
    "Meunasah Gampong Baro",
    "Tajug Al-Ikhlas",
    "مصلى النور",
  ])("knows a musholla by its name: %s", (name) => {
    expect(classifyType({ amenity: "place_of_worship", religion: "muslim", name })).toBe("musholla");
  });

  it.each(["Masjid Istiqlal", "Mesjid Raya", "MASJID JAMI' AL-IKHLAS", "مسجد النور", "Al-Akbar Mosque"])(
    "a masjid by its name, or by default: %s",
    (name) => {
      expect(classifyType({ amenity: "place_of_worship", religion: "muslim", name })).toBe("masjid");
    }
  );

  it("knows an unnamed musholla by its tags", () => {
    expect(classifyType({ amenity: "place_of_worship", place_of_worship: "musalla" })).toBe("musholla");
    expect(classifyType({ amenity: "place_of_worship", place_of_worship: "mushola" })).toBe("musholla");
    expect(classifyType({ building: "musalla" })).toBe("musholla");
    expect(classifyType({ building: "mosque" })).toBe("masjid");
  });

  it("goes by the name the user sees when the tags say otherwise", () => {
    expect(classifyType({ place_of_worship: "musalla", name: "Masjid Al-Falah" })).toBe("masjid");
  });

  it("reads the other names when there is no name", () => {
    expect(classifyType({ "name:id": "Musholla Al-Amin" })).toBe("musholla");
  });

  it("isn't fooled by words that only start alike", () => {
    expect(classifyType({ name: "Museum Masjid" })).toBe("masjid");
    expect(classifyType({ name: "Musalam" })).toBe("masjid");
  });
});

describe("isIslamicName", () => {
  it("accepts the names of masjid and musholla, and nothing else", () => {
    for (const name of ["Masjid Al-Amin", "Mushola Al-Ikhlas", "Surau Lama", "مسجد"]) expect(isIslamicName(name)).toBe(true);
    for (const name of ["Gereja Katedral", "Pura Besakih", "Vihara Dharma", "Museum Nasional", "Jalan Masjid"]) {
      expect(isIslamicName(name)).toBe(false);
    }
  });
});

describe("displayName", () => {
  it("uses OpenStreetMap's name, or another when there is none", () => {
    expect(displayName({ name: "Masjid Al-Amin" })).toBe("Masjid Al-Amin");
    expect(displayName({ "name:id": "Masjid Indo" })).toBe("Masjid Indo");
    expect(displayName({ "name:en": "English Mosque" })).toBe("English Mosque");
    expect(displayName({ old_name: "Old Mosque" })).toBe("Old Mosque");
  });

  it("names a place without a name by its kind", () => {
    expect(displayName(undefined)).toBe("Masjid");
    expect(displayName({ amenity: "place_of_worship" })).toBe("Masjid");
    expect(displayName({ place_of_worship: "musalla" })).toBe("Musholla");
  });

  it("adds the street to a bare 'Masjid' or 'Musholla'", () => {
    expect(displayName({ name: "Masjid", "addr:street": "Jl. Merdeka" })).toBe("Masjid (Jl. Merdeka)");
    expect(displayName({ name: "Mushola", "addr:full": "Gg. Damai 3" })).toBe("Mushola (Gg. Damai 3)");
    expect(displayName({ name: "Masjid Raya", "addr:street": "Jl. Merdeka" })).toBe("Masjid Raya");
  });
});

describe("normalizeName", () => {
  it("compares names past case, accents, punctuation and spelling", () => {
    expect(normalizeName("Masjid Jami' Al-Ikhlas")).toBe(normalizeName("MESJID JAMI AL IKHLAS"));
    expect(normalizeName("Mushola Nurul-Huda")).toBe(normalizeName("musholla nurul huda"));
    expect(normalizeName("Musholā An-Nur")).toBe("musholla an nur");
    expect(normalizeName("Masjid Al-Ikhlas")).not.toBe(normalizeName("Musholla Al-Ikhlas"));
  });
});

describe("distanceMeters", () => {
  it("measures short distances to within a meter", () => {
    // 0.001° of latitude is ~111 m
    expect(distanceMeters(-6.2, 106.8, -6.201, 106.8)).toBeCloseTo(111.2, 0);
  });
});

describe("dedupe", () => {
  // ~11 m per 0.0001°
  const at = (name: string | undefined, dLat: number, dLng = 0) => ({ name, lat: -6.2 + dLat, lng: 106.8 + dLng });

  it("lists a mosque mapped as a point and as its building once", () => {
    const point = at("Masjid Al-Ikhlas", 0);
    const building = at("MASJID AL IKHLAS", 0.0004);
    expect(dedupe([point, building])).toEqual([point]);
  });

  it("drops an unnamed entry next to another, and keeps the first", () => {
    const named = at("Masjid Al-Amin", 0);
    const unnamed = at(undefined, 0.0003, 0.0003);
    expect(dedupe([named, unnamed])).toEqual([named]);
    expect(dedupe([at(undefined, 0), at(undefined, 0.0002)])).toHaveLength(1);
  });

  it("keeps places that only share a name, or only stand close", () => {
    // The same, very common name ~330 m apart
    expect(dedupe([at("Masjid Al-Ikhlas", 0), at("Masjid Al-Ikhlas", 0.003)])).toHaveLength(2);
    // Two names ~20 m apart
    expect(dedupe([at("Masjid Al-Ikhlas", 0), at("Musholla Al-Ikhlas", 0.0002)])).toHaveLength(2);
    // Unnamed, ~90 m apart
    expect(dedupe([at(undefined, 0), at(undefined, 0.0008)])).toHaveLength(2);
  });

  it("finds duplicates across grid cells", () => {
    // Either side of a cell border at -6.2000
    const a = at("Masjid Batas", 0.00001);
    const b = at("Masjid Batas", -0.00001);
    expect(dedupe([a, b])).toEqual([a]);
  });

  it("handles many places quickly", () => {
    const many = Array.from({ length: 20_000 }, (_, i) => at(`Masjid ${i}`, (i % 200) * 0.001, Math.floor(i / 200) * 0.001));
    const start = performance.now();
    expect(dedupe(many)).toHaveLength(20_000);
    expect(performance.now() - start).toBeLessThan(2_000);
  });
});
