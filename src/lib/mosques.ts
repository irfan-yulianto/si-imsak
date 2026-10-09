import type { Mosque } from "@/types";
import { classifyType, completeness, dedupe, displayName, distanceMeters, osmName } from "@/lib/mosque-osm";

export { distanceMeters } from "@/lib/mosque-osm";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
  remark?: string;
}

type Coords = { lat: number; lng: number };

/**
 * Format distance for display: "120 m" or "1.2 km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** The radius a search starts with (meters) */
export const DEFAULT_RADIUS = 2000;

/**
 * The radii /api/mosques accepts (meters): what the finder can ask for, starting at
 * DEFAULT_RADIUS and widening with widerRadius(), and what earlier versions asked for.
 * A fixed set keeps CDN cache entries shared, and arbitrary queries away from the
 * public Overpass mirrors.
 */
export const SEARCH_RADII: readonly number[] = [2000, 3000, 4000, 6000, 8000, 10000];

/** The widest search "Perluas Pencarian" can reach (meters) */
export const MAX_SEARCH_RADIUS = 10000;

/** The radius "Perluas Pencarian" moves to: twice as wide, up to the maximum */
export function widerRadius(radius: number): number {
  return Math.min(radius * 2, MAX_SEARCH_RADIUS);
}

/** A search radius for display: "800 m", "2 km", "2.5 km" */
export function formatRadius(meters: number): string {
  return meters >= 1000 ? `${meters / 1000} km` : `${meters} m`;
}

/** The most mosques one answer holds, nearest first */
export const RESULT_LIMIT = 50;

/** How a masjid's or a musholla's name starts, in Overpass's (POSIX) regular expressions */
const ISLAMIC_NAME = "^(m[ae]sjid|mu(s|sh)[oa]l|langgar|surau|meunasah|tajug)";

/**
 * Overpass QL for the mosques and prayer rooms within `radius` of a point: nodes, ways
 * and relations that are
 * 1. places of worship of Islam (religion=muslim, or the common misspelling islam);
 * 2. places of worship without a religion, named like a masjid or a musholla;
 * 3. mosque or musalla buildings;
 * 4. tagged place_of_worship=musalla, in its spellings.
 */
export function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  const around = `(around:${radius},${lat},${lng})`;
  return (
    "[out:json][timeout:8];(" +
    `nwr["amenity"="place_of_worship"]["religion"~"^(muslim|islam)$"]${around};` +
    `nwr["amenity"="place_of_worship"][!"religion"]["name"~"${ISLAMIC_NAME}",i]${around};` +
    `nwr["building"~"^(mosque|musalla)$"]${around};` +
    `nwr["place_of_worship"~"^(musall?a|mushall?a|mush?oll?a)$"]${around};` +
    ");out center body qt;"
  );
}

function getCenter(element: OverpassElement): Coords | null {
  if (element.type === "node" && element.lat != null && element.lon != null) {
    return { lat: element.lat, lng: element.lon };
  }
  // Ways and relations have a center property when using "out center"
  if (element.center) {
    return { lat: element.center.lat, lng: element.center.lon };
  }
  return null;
}

/**
 * The mosques in an Overpass answer, nearest to the given point first, at most `limit`.
 * A place mapped twice (as a point and as its building, say) is listed once.
 */
export function parseOverpassResponse(
  data: OverpassResponse,
  userLat: number,
  userLng: number,
  limit: number = RESULT_LIMIT
): Mosque[] {
  if (!data?.elements?.length) return [];

  const seen = new Set<string>();
  const found: { mosque: Mosque; name?: string; lat: number; lng: number; rank: number }[] = [];

  for (const el of data.elements) {
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const center = getCenter(el);
    if (!center) continue;

    const tags = el.tags ?? {};
    found.push({
      mosque: {
        id: key,
        name: displayName(tags),
        lat: center.lat,
        lng: center.lng,
        distance: distanceMeters(userLat, userLng, center.lat, center.lng),
        address: tags["addr:street"] || tags["addr:full"] || undefined,
        type: classifyType(tags),
      },
      name: osmName(tags) || undefined,
      lat: center.lat,
      lng: center.lng,
      rank: completeness(tags),
    });
  }

  found.sort((a, b) => b.rank - a.rank);
  return dedupe(found)
    .map((entry) => entry.mosque)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/** Nearest first, measured from `coords` */
export function sortByDistance(mosques: readonly Mosque[], coords: Coords): Mosque[] {
  return mosques
    .map((m) => ({ ...m, distance: distanceMeters(coords.lat, coords.lng, m.lat, m.lng) }))
    .sort((a, b) => a.distance - b.distance);
}

/** One search's answer: where it searched, how far, and what it found there */
export interface MosqueAnswer {
  /** The point the server measured from (the rounded coordinates sent) */
  center: Coords;
  radius: number;
  /** Every mosque within this distance of `center` is in `mosques` */
  coverage: number;
  /** Nearest to `center` first */
  mosques: Mosque[];
}

/**
 * How far around its center an answer is complete: the whole radius, unless the list
 * was cut at the limit, and then as far as its farthest mosque. `mosques` comes as the
 * server sent it: nearest to the center first.
 */
export function coverageOf(mosques: readonly Mosque[], radius: number, limit: number = RESULT_LIMIT): number {
  return mosques.length < limit ? radius : mosques[mosques.length - 1].distance;
}

/**
 * The answer's mosques that are surely the nearest from `coords`: those closer than
 * the answer's coverage, less how far `coords` lies from where it searched. Nearer
 * mosques the answer didn't reach can't exist, so the order is right.
 */
export function visibleMosques(answer: MosqueAnswer, coords: Coords): Mosque[] {
  const reach = answer.coverage - distanceMeters(answer.center.lat, answer.center.lng, coords.lat, coords.lng);
  return sortByDistance(answer.mosques, coords).filter((m) => m.distance <= reach);
}

/** Of an answer's mosques, this many must surely be the nearest, or it's asked again */
const MIN_VISIBLE = 5;
/** Having found nothing, a search is repeated after moving this far (meters) */
const EMPTY_MOVED_M = 200;

/** Whether `coords` is too far from what `answer` covers, so the search must be repeated */
export function needsSearch(answer: MosqueAnswer, coords: Coords): boolean {
  if (answer.mosques.length === 0) {
    return distanceMeters(answer.center.lat, answer.center.lng, coords.lat, coords.lng) > EMPTY_MOVED_M;
  }
  return visibleMosques(answer, coords).length < Math.min(MIN_VISIBLE, answer.mosques.length);
}
