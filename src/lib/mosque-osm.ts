// Mosques as OpenStreetMap describes them: what each is called, whether it is a masjid
// or a musholla, and which entries describe the same place. Shared by the app and the
// dataset build (scripts/mosque-data), which runs this file in plain Node: no imports,
// and only TypeScript that Node can strip.

export type MosqueType = "masjid" | "musholla";

type Tags = Readonly<Record<string, string | undefined>>;

/** "Masjid …" and "Mesjid …"; "مسجد" in Arabic script */
const MASJID_NAME = /^(?:m[ae]sjid\b|مسجد)/i;
/**
 * A musholla by its name: musholla, mushola, musala, musalla, mushalla, the hurried
 * "muslla", … and the regional langgar, surau, meunasah (Aceh) and tajug (Sunda);
 * "مصلى" in Arabic script
 */
const MUSHOLLA_NAME = /^(?:mu(?:s|sh)[oa]?ll?ah?\b|langgar\b|surau\b|meunasah\b|tajug\b|مصل[ىي])/i;
/** place_of_worship=* and building=* values that mean a musholla */
const MUSHOLLA_TAG = /^(?:musall?a|mushall?a|mush?oll?ah?|prayer_room|langgar|surau)$/i;

/** Accents dropped (ā → a), so spellings compare alike */
function plain(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();
}

/** The name OpenStreetMap gives the place ("" when it has none) */
export function osmName(tags: Tags): string {
  return (tags.name || tags["name:id"] || tags["name:en"] || tags.old_name || "").trim();
}

/** Whether `name` starts the way a masjid's or a musholla's does */
export function isIslamicName(name: string): boolean {
  const text = plain(name);
  return MASJID_NAME.test(text) || MUSHOLLA_NAME.test(text);
}

/** A musholla when its name or its tags say so, else a masjid */
export function classifyType(tags: Tags): MosqueType {
  const name = plain(osmName(tags));
  if (MUSHOLLA_NAME.test(name)) return "musholla";
  if (MASJID_NAME.test(name)) return "masjid";
  if (MUSHOLLA_TAG.test(tags.place_of_worship ?? "") || MUSHOLLA_TAG.test(tags.building ?? "")) return "musholla";
  return "masjid";
}

/** The name to show: OpenStreetMap's, or what kind of place it is when it has none */
export function displayName(tags: Tags | undefined): string {
  if (!tags) return "Masjid";
  const name = osmName(tags);
  const street = tags["addr:street"] || tags["addr:full"];
  if (!name) return classifyType(tags) === "musholla" ? "Musholla" : "Masjid";
  // A bare "Masjid" or "Musholla" says little: the street tells which one
  if (street && /^(?:m[ae]sjid|mu(?:s|sh)[oa]?ll?ah?)$/i.test(plain(name))) return `${name} (${street})`;
  return name;
}

/** Keys that make a building named like a mosque something else (a shop, a bus stop, …) */
const SOMETHING_ELSE = [
  "amenity", "shop", "office", "craft", "tourism", "leisure", "healthcare", "highway",
  "railway", "public_transport", "aeroway", "man_made", "power", "emergency",
];

/**
 * Whether the tags describe a masjid or a musholla in use: what the Overpass query asks
 * for, and also a building that only has a mosque's name (mapped from the air, often).
 */
export function isMosque(tags: Tags): boolean {
  if (tags.disused === "yes" || tags.abandoned === "yes" || tags.ruins === "yes" || tags.building === "ruins") return false;
  const religion = tags.religion?.toLowerCase();
  if (religion && religion !== "muslim" && religion !== "islam") return false;
  if (tags.amenity === "place_of_worship") return Boolean(religion) || isIslamicName(osmName(tags)) || MUSHOLLA_TAG.test(tags.place_of_worship ?? "");
  if (/^(?:mosque|musalla)$/i.test(tags.building ?? "") || MUSHOLLA_TAG.test(tags.place_of_worship ?? "")) return true;
  return Boolean(tags.building) && isIslamicName(osmName(tags)) && !SOMETHING_ELSE.some((key) => tags[key]);
}

/** How much an entry tells: of two describing one place, the fuller one is kept */
export function completeness(tags: Tags): number {
  return (osmName(tags) ? 4 : 0) + (tags["addr:street"] || tags["addr:full"] ? 2 : 0) + (tags.amenity ? 1 : 0);
}

/** A place in the mosque dataset, before duplicates are dropped */
export interface OsmPlace {
  /** n123, w123 or r123 */
  id: string;
  lat: number;
  lng: number;
  type: MosqueType;
  /** The name to show (see displayName) */
  name: string;
  /** OpenStreetMap's own name, for finding duplicates */
  osmName?: string;
  street?: string;
  /** See completeness() */
  rank: number;
}

type Position = readonly number[];

/** Every position of a GeoJSON geometry's coordinates, however deeply nested */
function* positions(coordinates: unknown): Generator<Position> {
  if (!Array.isArray(coordinates)) return;
  if (typeof coordinates[0] === "number") {
    yield coordinates as Position;
    return;
  }
  for (const inner of coordinates) yield* positions(inner);
}

/**
 * The OpenStreetMap id behind an `osmium export --add-unique-id=type_id` feature id:
 * n123, w123 and r123 as they are; an area's a246 is way 123, a247 relation 123.
 */
export function osmIdOf(featureId: unknown): string | null {
  const match = /^([nwra])(\d+)$/.exec(String(featureId ?? ""));
  if (!match) return null;
  if (match[1] !== "a") return `${match[1]}${match[2]}`;
  const area = Number(match[2]);
  return area % 2 === 0 ? `w${area / 2}` : `r${(area - 1) / 2}`;
}

/**
 * A feature of the GeoJSON sequence `osmium export` writes, as a place of the dataset;
 * null when it isn't a mosque. A building's position is the center of its bounding box,
 * like Overpass's "out center".
 */
export function placeFromFeature(feature: {
  id?: unknown;
  geometry?: { type?: string; coordinates?: unknown } | null;
  properties?: Record<string, unknown> | null;
}): OsmPlace | null {
  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(feature.properties ?? {})) {
    if (typeof value === "string") tags[key] = value;
  }
  const id = osmIdOf(feature.id);
  if (!id || !isMosque(tags)) return null;

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lng, lat] of positions(feature.geometry?.coordinates)) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) return null;

  return {
    id,
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
    type: classifyType(tags),
    name: displayName(tags),
    osmName: osmName(tags) || undefined,
    street: tags["addr:street"] || tags["addr:full"] || undefined,
    rank: completeness(tags),
  };
}

/**
 * A name reduced for comparison: case, accents, punctuation and the spellings of
 * "masjid" and "musholla" ignored ("Masjid Jami' Al-Ikhlas" = "mesjid jami al ikhlas").
 */
export function normalizeName(name: string): string {
  return plain(name)
    .toLowerCase()
    .replace(/['’‘`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/^m[ae]sjid\b/, "masjid")
    .replace(/^mu(?:s|sh)[oa]?ll?ah?\b/, "musholla");
}

/**
 * Distance in meters between two points, by the equirectangular approximation: well
 * within 1% of the great-circle distance over the few kilometers the finder searches,
 * and cheaper than the haversine formula.
 */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  const dLat = lat2Rad - lat1Rad;

  let dLngDeg = lng2 - lng1;
  if (dLngDeg > 180) dLngDeg -= 360;
  else if (dLngDeg < -180) dLngDeg += 360;
  const dLng = toRad(dLngDeg);

  const x = dLng * Math.cos((lat1Rad + lat2Rad) / 2);
  const y = dLat;
  return Math.sqrt(x * x + y * y) * R;
}

/** Entries with the same name this close describe one place: a point and its building */
const SAME_NAME_M = 100;
/** An entry without a name this close to another describes the same place */
const UNNAMED_M = 60;
/** Grid cells (degrees, ~110 m): every pair within 100 m is in neighbouring cells */
const CELL_DEG = 0.001;

/**
 * Whether two names (normalized) name one place: the same, or one the start of the
 * other, as "Masjid Baitul Hikmah" and "Masjid Baitul Hikmah Gondolayu Lor". The shorter
 * needs three words, so that "Masjid Raya" doesn't swallow "Masjid Raya Bintaro".
 */
function sameName(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return long.startsWith(`${short} `) && short.split(" ").length >= 3;
}

/**
 * Drops the entries that describe a place already in the list: one with the same name
 * (see sameName) within 100 m (a mosque mapped both as a point and as its building), or
 * one without a name within 60 m of another. `places` comes in order of preference: of
 * duplicates, the first is kept, so put named and more complete entries first. `nameOf`
 * gives each entry's OpenStreetMap name (none: "" or undefined).
 */
export function dedupe<T extends { lat: number; lng: number }>(
  places: readonly T[],
  nameOf: (place: T) => string | undefined = (place) => (place as { name?: string }).name
): T[] {
  const kept: T[] = [];
  const grid = new Map<string, { place: T; key: string }[]>();
  for (const place of places) {
    const name = nameOf(place);
    const key = name ? normalizeName(name) : "";
    const row = Math.floor(place.lat / CELL_DEG);
    const col = Math.floor(place.lng / CELL_DEG);
    let duplicate = false;
    for (let dr = -1; dr <= 1 && !duplicate; dr++) {
      for (let dc = -1; dc <= 1 && !duplicate; dc++) {
        duplicate = (grid.get(`${row + dr}:${col + dc}`) ?? []).some((other) => {
          const meters = distanceMeters(place.lat, place.lng, other.place.lat, other.place.lng);
          return key && other.key ? sameName(key, other.key) && meters <= SAME_NAME_M : meters <= UNNAMED_M;
        });
      }
    }
    if (duplicate) continue;
    kept.push(place);
    const cell = `${row}:${col}`;
    grid.set(cell, [...(grid.get(cell) ?? []), { place, key }]);
  }
  return kept;
}
