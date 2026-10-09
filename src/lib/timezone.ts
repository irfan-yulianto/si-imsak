import { TimezoneLabel } from "@/types";
import { TIMEZONE_MAP } from "./constants";

/**
 * Normalize a province name so spelling variants match the map:
 * "Kepulauan Riau" → "KEP RIAU", "D.I. Yogyakarta" / "Daerah Istimewa Yogyakarta" → "DI YOGYAKARTA".
 */
export function normalizeProvince(name: string): string {
  return name
    .toUpperCase()
    .replace(/[.(),]/g, " ")
    .replace(/\bDAERAH ISTIMEWA\b/g, "DI")
    .replace(/\bD I\b/g, "DI")
    .replace(/\bDAERAH KHUSUS IBUKOTA\b/g, "DKI")
    .replace(/\bKEPULAUAN\b/g, "KEP")
    .replace(/\s+/g, " ")
    .trim();
}

const PROVINCE_TIMEZONES = new Map<string, TimezoneLabel>(
  Object.entries(TIMEZONE_MAP).map(([province, tz]) => [normalizeProvince(province), tz])
);

const warnedProvinces = new Set<string>();

/**
 * Get timezone label from province/daerah name.
 * Unknown names fall back to WIB (most of the population) and are warned once,
 * so a renamed province upstream shows up in logs instead of silently skewing times.
 */
export function getTimezone(daerah: string): TimezoneLabel {
  const key = normalizeProvince(daerah);
  const tz = PROVINCE_TIMEZONES.get(key);
  if (tz) return tz;
  if (key && !warnedProvinces.has(key)) {
    warnedProvinces.add(key);
    console.warn(`[timezone] Unknown province "${daerah}", defaulting to WIB`);
  }
  return "WIB";
}

/**
 * Get UTC offset hours for a timezone label
 */
export function getUtcOffset(tz: TimezoneLabel): number {
  switch (tz) {
    case "WIB":
      return 7;
    case "WITA":
      return 8;
    case "WIT":
      return 9;
    default:
      return 7;
  }
}
