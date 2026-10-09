import { describe, it, expect } from "vitest";
import {
  classifyType,
  dedupe,
  displayName,
  distanceMeters,
  isIslamicName,
  isMosque,
  normalizeName,
  osmIdOf,
  placeFromFeature,
} from "./mosque-osm";

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

describe("isMosque", () => {
  it("takes what the Overpass query takes", () => {
    expect(isMosque({ amenity: "place_of_worship", religion: "muslim" })).toBe(true);
    expect(isMosque({ amenity: "place_of_worship", religion: "islam" })).toBe(true);
    expect(isMosque({ amenity: "place_of_worship", name: "Mushola Al-Amin" })).toBe(true);
    expect(isMosque({ building: "mosque" })).toBe(true);
    expect(isMosque({ place_of_worship: "musalla" })).toBe(true);
  });

  it("and a building that only has a mosque's name", () => {
    expect(isMosque({ building: "yes", name: "Masjid Al-Falah" })).toBe(true);
    expect(isMosque({ building: "yes", name: "Langgar Kidul" })).toBe(true);
  });

  it("but not other religions, other things with a mosque's name, or places no longer in use", () => {
    expect(isMosque({ amenity: "place_of_worship", religion: "christian", name: "Masjid" })).toBe(false);
    expect(isMosque({ amenity: "place_of_worship", name: "Gereja Santo Yosef" })).toBe(false);
    expect(isMosque({ building: "yes", name: "Gedung Serbaguna" })).toBe(false);
    expect(isMosque({ highway: "bus_stop", name: "Masjid Raya" })).toBe(false);
    expect(isMosque({ building: "retail", shop: "clothes", name: "Masjid Busana" })).toBe(false);
    expect(isMosque({ name: "Masjid Raya" })).toBe(false);
    expect(isMosque({ amenity: "place_of_worship", religion: "muslim", disused: "yes" })).toBe(false);
    expect(isMosque({ building: "ruins", name: "Masjid Tua" })).toBe(false);
  });
});

describe("osmIdOf", () => {
  it("reads node, way and relation ids, and turns area ids back into them", () => {
    expect(osmIdOf("n123")).toBe("n123");
    expect(osmIdOf("w45")).toBe("w45");
    expect(osmIdOf("a246")).toBe("w123");
    expect(osmIdOf("a247")).toBe("r123");
    expect(osmIdOf(17)).toBeNull();
    expect(osmIdOf(undefined)).toBeNull();
  });
});

describe("placeFromFeature", () => {
  it("places a point where it is, and a building at the center of its bounds", () => {
    expect(
      placeFromFeature({
        id: "n1",
        geometry: { type: "Point", coordinates: [106.8, -6.2] },
        properties: { amenity: "place_of_worship", religion: "muslim", name: "Mushola Al-Amin", "addr:street": "Jl. Damai" },
      })
    ).toEqual({ id: "n1", lat: -6.2, lng: 106.8, type: "musholla", name: "Mushola Al-Amin", osmName: "Mushola Al-Amin", street: "Jl. Damai", rank: 7 });

    const building = placeFromFeature({
      id: "a20",
      geometry: { type: "Polygon", coordinates: [[[106.8, -6.2], [106.802, -6.2], [106.802, -6.198], [106.8, -6.198], [106.8, -6.2]]] },
      properties: { building: "mosque" },
    });
    expect(building).toMatchObject({ id: "w10", type: "masjid", name: "Masjid", osmName: undefined, rank: 0 });
    expect(building!.lat).toBeCloseTo(-6.199, 6);
    expect(building!.lng).toBeCloseTo(106.801, 6);
  });

  it("skips what isn't a mosque, or has no position", () => {
    expect(placeFromFeature({ id: "n1", geometry: { type: "Point", coordinates: [106.8, -6.2] }, properties: { shop: "bakery" } })).toBeNull();
    expect(placeFromFeature({ id: "n1", geometry: null, properties: { building: "mosque" } })).toBeNull();
    expect(placeFromFeature({ id: "x", geometry: { type: "Point", coordinates: [106.8, -6.2] }, properties: { building: "mosque" } })).toBeNull();
  });
});
