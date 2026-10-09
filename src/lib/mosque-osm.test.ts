import { describe, it, expect } from "vitest";
import {
  addMissing,
  classifyType,
  dedupe,
  displayName,
  distanceMeters,
  isIslamicName,
  isMosque,
  normalizeName,
  osmIdOf,
  OVERTURE_MIN_CONFIDENCE,
  OVERTURE_SHARED_POINT,
  placeFromFeature,
  placeFromOverture,
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
    "Muslla Sumbek",
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
    expect(classifyType({ name: "Muslimat NU" })).toBe("masjid");
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

  it("takes a name that starts with another's three words for the same place", () => {
    const short = at("masjid baitul hikmah", 0);
    expect(dedupe([short, at("Masjid Baitul Hikmah Gondolayu Lor", 0.0005)])).toEqual([short]);
    // Two words are too common a start: "Masjid Raya" is in many names
    expect(dedupe([at("Masjid Raya", 0), at("Masjid Raya Bintaro", 0.0005)])).toHaveLength(2);
    // Not a start at a word's end
    expect(dedupe([at("Masjid Al Ikhlas", 0), at("Masjid Al Ikhlasul Amal", 0.0005)])).toHaveLength(2);
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
    ).toEqual({ id: "n1", lat: -6.2, lng: 106.8, type: "musholla", name: "Mushola Al-Amin", sourceName: "Mushola Al-Amin", street: "Jl. Damai", rank: 7 });

    const building = placeFromFeature({
      id: "a20",
      geometry: { type: "Polygon", coordinates: [[[106.8, -6.2], [106.802, -6.2], [106.802, -6.198], [106.8, -6.198], [106.8, -6.2]]] },
      properties: { building: "mosque" },
    });
    expect(building).toMatchObject({ id: "w10", type: "masjid", name: "Masjid", sourceName: undefined, rank: 0 });
    expect(building!.lat).toBeCloseTo(-6.199, 6);
    expect(building!.lng).toBeCloseTo(106.801, 6);
  });

  it("knows a mosque OpenStreetMap links to Wikidata or Wikipedia as well-known", () => {
    const at = { type: "Point", coordinates: [106.8312, -6.1703] };
    expect(placeFromFeature({ id: "r1", geometry: at, properties: { building: "mosque", name: "Masjid Istiqlal", wikidata: "Q211581" } })).toMatchObject({
      notable: true,
    });
    expect(placeFromFeature({ id: "r1", geometry: at, properties: { building: "mosque", name: "Masjid Al-Amin" } })).not.toHaveProperty("notable");
  });

  it("skips what isn't a mosque, or has no position", () => {
    expect(placeFromFeature({ id: "n1", geometry: { type: "Point", coordinates: [106.8, -6.2] }, properties: { shop: "bakery" } })).toBeNull();
    expect(placeFromFeature({ id: "n1", geometry: null, properties: { building: "mosque" } })).toBeNull();
    expect(placeFromFeature({ id: "x", geometry: { type: "Point", coordinates: [106.8, -6.2] }, properties: { building: "mosque" } })).toBeNull();
  });
});

describe("placeFromOverture", () => {
  const record = {
    id: "E46A95AF-60b4-4e83-8418-7ca17f1f7349",
    lat: -6.20123,
    lng: 106.80456,
    name: " Mushola  Al-Amin ",
    street: "Jl. Damai,",
    confidence: 0.8,
    sharing: 1,
  };

  it("takes a place named like a mosque that Overture is sure enough of", () => {
    expect(placeFromOverture(record)).toEqual({
      id: "oe46a95af60b44e8384187ca17f1f7349",
      lat: -6.20123,
      lng: 106.80456,
      type: "musholla",
      name: "Mushola Al-Amin",
      sourceName: "Mushola Al-Amin",
      street: "Jl. Damai",
      rank: 0.8,
    });
    // A bare name is told apart by its street, as from OpenStreetMap
    expect(placeFromOverture({ ...record, name: "Masjid", street: "Unnamed Road, Jl. Kenanga" })).toMatchObject({
      type: "masjid",
      name: "Masjid (Jl. Kenanga)",
      street: "Jl. Kenanga",
    });
    expect(placeFromOverture({ ...record, street: "Unnamed Road" })?.street).toBeUndefined();
    // A few places on one point, as in a mosque's own grounds; one coordinate that happens to be round
    expect(placeFromOverture({ ...record, sharing: OVERTURE_SHARED_POINT - 1 })).not.toBeNull();
    expect(placeFromOverture({ ...record, lat: -6.2 })).not.toBeNull();
  });

  it.each([
    ["a shop", { name: "Muslim Galeri Indonesia" }],
    ["a madrasah", { name: "Madrasah As Sunnah" }],
    ["a name that isn't a mosque's", { name: "Jembatan Sirotol Mustaqim" }],
    ["a place Overture isn't sure of", { confidence: OVERTURE_MIN_CONFIDENCE - 0.01 }],
    ["no confidence", { confidence: undefined }],
    ["a point many places share: a town's, not the mosque's", { sharing: OVERTURE_SHARED_POINT }],
    ["a position rounded to three decimals", { lat: -3.65, lng: 103.8 }],
    ["an id that isn't Overture's", { id: "n123" }],
    ["no position", { lat: undefined }],
  ])("leaves out %s", (_what, overrides) => {
    expect(placeFromOverture({ ...record, ...overrides })).toBeNull();
  });
});

describe("addMissing", () => {
  // ~11 m per 0.0001°
  const at = (name: string | undefined, dLat: number, type: "masjid" | "musholla" = "masjid") => ({ name, type, lat: -6.2 + dLat, lng: 106.8 });
  type At = ReturnType<typeof at> & { notable?: boolean };
  const add = (listed: At[], others: At[]) => addMissing(listed, others, (place) => place.name);

  it("adds what isn't listed nearby", () => {
    const other = at("Masjid Nurul Huda", 0.001);
    expect(add([at("Masjid Al-Ikhlas", 0)], [other])).toEqual([other]);
  });

  it("leaves out what is within 60 m of a listed place, whatever the names", () => {
    expect(add([at("Masjid Raya Baiturrahman", 0)], [at("Masjid Jami Baiturrahim", 0.0005)])).toEqual([]);
    expect(add([at(undefined, 0)], [at("Musholla Al-Amin", 0.0005)])).toEqual([]);
  });

  it("leaves out what is named alike within 300 m: the same mosque, placed elsewhere", () => {
    // The same name, its longer form, and the same but for "Masjid Jami'"
    expect(add([at("Masjid Al-Ikhlas", 0)], [at("MASJID AL IKHLAS", 0.002)])).toEqual([]);
    expect(add([at("Masjid Baitul Hikmah", 0)], [at("Masjid Baitul Hikmah Gondolayu", 0.002)])).toEqual([]);
    expect(add([at("Al-Ikhlas", 0)], [at("Masjid Jami' Al-Ikhlas", 0.002)])).toEqual([]);
    // A musholla of the same name is another place
    expect(add([at("Al-Ikhlas", 0)], [at("Musholla Al-Ikhlas", 0.002, "musholla")])).toHaveLength(1);
    // So are two that are only called "Masjid"
    expect(add([at("Masjid", 0)], [at("Masjid", 0.002)])).toHaveLength(1);
  });

  it("leaves out a rare name's namesake up to 2 km off: a page pinned on the town square", () => {
    const istiqlal = [at("Masjid Istiqlal", 0)];
    // ~720 m, and the town after the name
    expect(add(istiqlal, [at("Masjid Istiqlal - Jakarta", 0.0065)])).toEqual([]);
    // ~2.1 km: another mosque
    expect(add(istiqlal, [at("Masjid Istiqlal", 0.019)])).toHaveLength(1);
  });

  it("reaches less far for a common name, which many mosques nearby may carry", () => {
    // 41 "Al-Ikhlas" in the country, ~11 km apart, and one more to add: within ~980 m of one, it is that one
    const elsewhere = Array.from({ length: 40 }, (_, i) => at("Masjid Al-Ikhlas", (i + 1) * 0.1));
    const listed = [at("Masjid Al-Ikhlas", 0), ...elsewhere];
    expect(add(listed, [at("Masjid Al-Ikhlas", 0.0063)])).toEqual([]);
    expect(add(listed, [at("Masjid Al-Ikhlas", -0.0099)])).toHaveLength(1);
  });

  it("leaves out the pages of a well-known mosque pinned across its town", () => {
    const istiqlal = [{ ...at("Masjid Istiqlal", 0), notable: true }];
    // ~1.3 km and ~3.2 km off, with the town after the name
    expect(add(istiqlal, [at("Masjid Istiqlal Jakarta Pusat", 0.012), at("Mesjid Istiqlal,jakarta", -0.029)])).toEqual([]);
    // Another town's, and a musholla of that name
    expect(add(istiqlal, [at("Masjid Istiqlal Bekasi", 0.12)])).toHaveLength(1);
    expect(add(istiqlal, [at("Musholla Istiqlal", 0.012, "musholla")])).toHaveLength(1);
    // A mosque not known beyond its street keeps its namesakes 1.3 km off
    expect(add([at("Masjid Istiqlal", 0)], [at("Masjid Istiqlal Jakarta Pusat", 0.012)])).toHaveLength(1);
  });

  it("doesn't take a well-known mosque's name for its own when many carry it", () => {
    // 51 "Al-Azhar" in the country: a campus's mosque 2 km from the well-known one is another
    const elsewhere = Array.from({ length: 50 }, (_, i) => at("Masjid Al-Azhar", (i + 1) * 0.1));
    const listed = [{ ...at("Masjid Al-Azhar", 0), notable: true }, ...elsewhere];
    expect(add(listed, [at("Masjid Al-Azhar Rawamangun", 0.018)])).toHaveLength(1);
  });

  it("adds a place the other source has twice once, the first given", () => {
    const sure = at("Masjid An-Nur", 0.003);
    expect(add([], [sure, at("Masjid An Nur", 0.0045), at("Masjid At-Taqwa", 0.0035)])).toEqual([sure]);
  });
});
