import type { TimezoneLabel } from "@/types";
import { BUILD_TIME } from "@/lib/constants";

/** UTC offset of each Indonesian time zone. Indonesia has no daylight saving time. */
export const TZ_OFFSET_HOURS: Record<TimezoneLabel, number> = { WIB: 7, WITA: 8, WIT: 9 };

export interface CityDate {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  /** YYYY-MM-DD */
  iso: string;
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/**
 * Calendar date in a WIB/WITA/WIT city at instant `epochMs`.
 * Pure UTC arithmetic, so the result never depends on the device's own time zone —
 * the server render, the client render and every user's phone agree.
 */
export function cityDate(epochMs: number, tz: TimezoneLabel): CityDate {
  const shifted = new Date(epochMs + (TZ_OFFSET_HOURS[tz] ?? 7) * 3_600_000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return { year, month, day, iso: `${year}-${pad(month)}-${pad(day)}` };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The build date in WIB. The page is prerendered at build time, so this is the only
 * "today" that the server render and the client's first render can agree on; real
 * dates are applied after hydration.
 */
export const BUILD_DATE: CityDate = cityDate(BUILD_TIME, "WIB");
