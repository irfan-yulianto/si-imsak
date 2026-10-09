import type { TimezoneLabel } from "@/types";

// Fallback location (Jakarta)
export const DEFAULT_LOCATION = {
  id: "58a2fc6ed39fd083f55d4182bf88826d",
  lokasi: "KOTA JAKARTA",
  daerah: "DKI JAKARTA",
};

// Build timestamp, inlined into server and client bundles by next.config.ts.
// Used where the server render and the client's first render must agree on "now".
export const BUILD_TIME = Number(process.env.NEXT_PUBLIC_BUILD_TIME) || Date.now();
// Identifies the deploy; the service worker URL carries it so each deploy gets a fresh worker.
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

// How long cached data stays usable on the device
export const SCHEDULE_CACHE_MAX_AGE = 7 * 24 * 3600000; // 7 days

// CDN caching for upstream data that changes rarely (schedules, city search, mosques).
// Vercel's edge serves repeat requests without invoking the function, and keeps
// serving the last good copy for a week if the function starts failing.
export const CDN_CACHE_DAY =
  "public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800";
export const NO_STORE = "no-store";

/**
 * Years the schedule API and month navigation accept: previous, current and next year.
 * Keeps the range rolling instead of a hardcoded cutoff. Pass the city's current year
 * on the client so the range never depends on the device clock or time zone.
 */
export function getScheduleYearRange(year: number = new Date().getUTCFullYear()): { min: number; max: number } {
  return { min: year - 1, max: year + 1 };
}

/**
 * Round a coordinate so nearby requests share CDN cache entries, and reveal no more of
 * the position than needed: 3 decimals (~110 m) by default.
 */
export function roundCoord(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Finding the city needs no more than ~1 km of the position (2 decimals) */
export const GEOCODE_DECIMALS = 2;

// Indonesia geographic bounds for input validation
export const INDONESIA_BOUNDS = {
  latMin: -11,
  latMax: 6,
  lngMin: 95,
  lngMax: 141,
} as const;

// Timezone of each of Indonesia's 38 provinces (Permendagri / BIG time-zone division).
// Keys use MyQuran's spelling; lookups go through normalizeProvince() in timezone.ts,
// so spelling variants like "KEPULAUAN RIAU" or "D.I. YOGYAKARTA" resolve too.
export const TIMEZONE_MAP = {
  // WIB (UTC+7) — Sumatra, Java, West & Central Kalimantan
  "ACEH": "WIB",
  "SUMATERA UTARA": "WIB",
  "SUMATERA BARAT": "WIB",
  "RIAU": "WIB",
  "JAMBI": "WIB",
  "SUMATERA SELATAN": "WIB",
  "BENGKULU": "WIB",
  "LAMPUNG": "WIB",
  "KEP. BANGKA BELITUNG": "WIB",
  "KEP. RIAU": "WIB",
  "DKI JAKARTA": "WIB",
  "JAWA BARAT": "WIB",
  "JAWA TENGAH": "WIB",
  "DI YOGYAKARTA": "WIB",
  "JAWA TIMUR": "WIB",
  "BANTEN": "WIB",
  "KALIMANTAN BARAT": "WIB",
  "KALIMANTAN TENGAH": "WIB",
  // WITA (UTC+8) — Bali, Nusa Tenggara, South/East/North Kalimantan, Sulawesi
  "BALI": "WITA",
  "NUSA TENGGARA BARAT": "WITA",
  "NUSA TENGGARA TIMUR": "WITA",
  "KALIMANTAN SELATAN": "WITA",
  "KALIMANTAN TIMUR": "WITA",
  "KALIMANTAN UTARA": "WITA",
  "SULAWESI UTARA": "WITA",
  "SULAWESI TENGAH": "WITA",
  "SULAWESI SELATAN": "WITA",
  "SULAWESI TENGGARA": "WITA",
  "GORONTALO": "WITA",
  "SULAWESI BARAT": "WITA",
  // WIT (UTC+9) — Maluku, Papua
  "MALUKU": "WIT",
  "MALUKU UTARA": "WIT",
  "PAPUA": "WIT",
  "PAPUA BARAT": "WIT",
  "PAPUA BARAT DAYA": "WIT",
  "PAPUA TENGAH": "WIT",
  "PAPUA PEGUNUNGAN": "WIT",
  "PAPUA SELATAN": "WIT",
} as const satisfies Record<string, TimezoneLabel>;
