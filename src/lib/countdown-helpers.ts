import { ScheduleDay, PrayerKey, PrayerName, PRAYER_NAMES, PRAYER_KEYS, TimezoneLabel } from "@/types";
import { addDays, cityDate, cityInstant } from "@/lib/city-time";

export interface NextPrayer {
  name: PrayerName;
  key: PrayerKey;
  time: string;
  remainingMs: number;
  isTomorrow?: boolean;
  /** The exact instant the time arrives (epoch ms) */
  targetMs: number;
}

export function findDay(days: ScheduleDay[], iso: string): ScheduleDay | null {
  return days.find((d) => d.date === iso) ?? null;
}

/**
 * The next of today's times in the city, or tomorrow's Imsak once Isya has passed.
 * Null when the data for today (or, after Isya, for tomorrow) is missing.
 */
export function getNextPrayer(days: ScheduleDay[], nowMs: number, tz: TimezoneLabel): NextPrayer | null {
  const today = cityDate(nowMs, tz).iso;
  const todayDay = findDay(days, today);
  if (todayDay) {
    for (let i = 0; i < PRAYER_KEYS.length; i++) {
      const key = PRAYER_KEYS[i];
      const time = todayDay[key];
      if (!time) continue;
      const targetMs = cityInstant(today, time, tz);
      if (targetMs > nowMs) {
        return { name: PRAYER_NAMES[i], key, time, remainingMs: targetMs - nowMs, targetMs };
      }
    }
  }

  // All of today's times passed: tomorrow's Imsak (on a month's last day, in next month's data)
  const tomorrow = addDays(today, 1);
  const tomorrowDay = findDay(days, tomorrow);
  if (tomorrowDay?.imsak) {
    const targetMs = cityInstant(tomorrow, tomorrowDay.imsak, tz);
    return { name: "Imsak", key: "imsak", time: tomorrowDay.imsak, remainingMs: targetMs - nowMs, isTomorrow: true, targetMs };
  }
  return null;
}

export function formatCountdown(ms: number): { hours: string; minutes: string; seconds: string } {
  if (ms <= 0) return { hours: "00", minutes: "00", seconds: "00" };
  const totalSeconds = Math.floor(ms / 1000);
  // Optimization: use primitive math to avoid unnecessary String().padStart allocations during 1000ms loop
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return {
    hours: h < 10 ? "0" + h : "" + h,
    minutes: m < 10 ? "0" + m : "" + m,
    seconds: s < 10 ? "0" + s : "" + s,
  };
}
