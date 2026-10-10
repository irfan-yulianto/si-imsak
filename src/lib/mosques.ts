import type { Mosque } from "@/types";
import { distanceMeters } from "@/lib/mosque-osm";
import { COARSE_M, MEDIUM_M } from "@/lib/geofix";

export { distanceMeters } from "@/lib/mosque-osm";

type Coords = { lat: number; lng: number };

/**
 * A distance for display, "120 m" or "1.2 km", as rough as the position it is measured
 * from is known (`accuracy`, m): past MEDIUM_M only to 100 m or half a kilometre,
 * "~100 m"; from an approximate position (COARSE_M) only an upper bound, "≤ 2.5 km".
 */
export function formatDistance(meters: number, accuracy = 0): string {
  if (accuracy >= COARSE_M) return `≤ ${formatRadius(Math.ceil((meters + accuracy) / 500) * 500)}`;
  if (accuracy > MEDIUM_M) {
    const rough = meters < 1000 ? Math.max(100, Math.round(meters / 100) * 100) : Math.round(meters / 500) * 500;
    return `~${formatRadius(rough)}`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** A distance searched, for display: "800 m", "2 km", "2.5 km" */
export function formatRadius(meters: number): string {
  return meters >= 1000 ? `${Math.round(meters / 100) / 10} km` : `${Math.round(meters)} m`;
}

/**
 * The decimals of the position the finder sends (~1 km): nearby users share CDN entries,
 * and the server's answer reaches far enough around it to order the mosques from the
 * exact position (see visibleMosques).
 */
export const SEARCH_DECIMALS = 2;

/**
 * The radii (meters) earlier versions of the finder send: /api/mosques still answers
 * them the way they expect, the mosques within the radius.
 */
export const SEARCH_RADII: readonly number[] = [2000, 3000, 4000, 6000, 8000, 10000];

/** Nearest first, measured from `coords` */
export function sortByDistance(mosques: readonly Mosque[], coords: Coords): Mosque[] {
  return mosques
    .map((m) => ({ ...m, distance: distanceMeters(coords.lat, coords.lng, m.lat, m.lng) }))
    .sort((a, b) => a.distance - b.distance);
}

/** One search's answer: where it searched, how far, and what it found there */
export interface MosqueAnswer {
  /** The point the server measured from (the rounded position sent) */
  center: Coords;
  /** Every mosque within this distance of `center` is in `mosques` (m) */
  coverage: number;
  /** Nearest to `center` first */
  mosques: Mosque[];
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
