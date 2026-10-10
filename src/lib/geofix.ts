// The GPS fix the mosque finder searches from: how good it is, and which reading replaces it

import type { GeoFix } from "@/types";
import { distanceMeters } from "@/lib/mosque-osm";

/** A fix this accurate (meters) is as good as a phone gets among buildings: the watch ends */
export const SHARP_M = 50;
/** Up to this (meters) the accuracy is middling; beyond it, distances are only rough */
export const MEDIUM_M = 300;
/**
 * From here (meters) the position is approximate, not a reading of the GPS or Wi-Fi:
 * Android reports exactly 2000 m to a browser allowed only the approximate location,
 * iOS kilometres. A real reading is never this rough.
 */
export const COARSE_M = 1000;
/** A fix older than this (ms) is sharpened again when the finder opens or comes back */
export const FRESH_MS = 2 * 60_000;

/**
 * Whether `fix` replaces `best`: when there is none, when it is as accurate, or when it
 * lies too far from it for both to be right (the user moved). A rougher reading of the
 * same spot is ignored.
 */
export function betterFix(best: GeoFix | null, fix: GeoFix): boolean {
  if (!best || fix.accuracy <= best.accuracy) return true;
  return distanceMeters(best.lat, best.lng, fix.lat, fix.lng) > best.accuracy + fix.accuracy;
}

/** `fix` while it is less than FRESH_MS old, else null */
export function freshFix(fix: GeoFix | null, now = Date.now()): GeoFix | null {
  return fix && now - fix.at < FRESH_MS ? fix : null;
}
