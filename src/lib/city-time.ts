import type { TimezoneLabel } from "@/types";
import { BUILD_TIME } from "@/lib/constants";

// Calendar and clock arithmetic for the cities' time zones. Pure UTC arithmetic, so
// no result depends on the device's own time zone: the server render, the client
// render and every user's phone agree. The only module allowed to read local dates
// (eslint.config.mjs bans Date#getMonth() and friends everywhere else).

/** UTC offset of each Indonesian time zone. Indonesia has no daylight saving time. */
export const TZ_OFFSET_HOURS: Record<TimezoneLabel, number> = { WIB: 7, WITA: 8, WIT: 9 };

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;

export interface CityDate {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  /** YYYY-MM-DD */
  iso: string;
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const offsetMs = (tz: TimezoneLabel) => (TZ_OFFSET_HOURS[tz] ?? 7) * HOUR_MS;

/** YYYY-MM-DD */
export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** YYYY-MM, e.g. for cache keys */
export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

/** Calendar date in a WIB/WITA/WIT city at instant `epochMs` */
export function cityDate(epochMs: number, tz: TimezoneLabel): CityDate {
  const shifted = new Date(epochMs + offsetMs(tz));
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return { year, month, day, iso: isoDate(year, month, day) };
}

/** Whole seconds since midnight in the city at instant `epochMs` (0-86399) */
export function citySecondsOfDay(epochMs: number, tz: TimezoneLabel): number {
  const local = (epochMs + offsetMs(tz)) % DAY_MS;
  return Math.floor((local < 0 ? local + DAY_MS : local) / 1000);
}

/** The instant (epoch ms) when the city's clock shows `hhmm` on date `iso` */
export function cityInstant(iso: string, hhmm: string, tz: TimezoneLabel): number {
  const [year, month, day] = iso.split("-").map(Number);
  const [hours, minutes] = hhmm.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes) - offsetMs(tz);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The month `delta` months away, e.g. shiftMonth(2026, 12, 1) → 2027-01 */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

/** The date `days` after (or before) `iso` */
export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** "9 Oktober 2026", without depending on the browser's locale data */
export function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * The build date in WIB. The page is prerendered at build time, so this is the only
 * "today" that the server render and the client's first render can agree on; real
 * dates are applied after hydration.
 */
export const BUILD_DATE: CityDate = cityDate(BUILD_TIME, "WIB");
