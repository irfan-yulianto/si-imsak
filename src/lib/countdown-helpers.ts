import { ScheduleDay, PrayerName, PRAYER_NAMES, PRAYER_KEYS } from "@/types";

export interface NextPrayer {
  name: PrayerName;
  key: string;
  time: string;
  remainingMs: number;
  isTomorrow?: boolean;
  targetMs?: number;
}

export function getLocalDate(now: Date, utcOffset: number): Date {
  return new Date(now.getTime() + utcOffset * 3600000);
}

export function getDateStr(localTime: Date): string {
  return localTime.toISOString().split("T")[0];
}

export function getTodaySchedule(
  schedules: ScheduleDay[],
  now: Date,
  utcOffset: number
): ScheduleDay | null {
  const dateStr = getDateStr(getLocalDate(now, utcOffset));
  return schedules.find((s) => s.date === dateStr) || null;
}

export function getTomorrowSchedule(
  schedules: ScheduleDay[],
  now: Date,
  utcOffset: number
): ScheduleDay | null {
  const localTime = getLocalDate(now, utcOffset);
  const tomorrow = new Date(localTime);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dateStr = getDateStr(tomorrow);
  return schedules.find((s) => s.date === dateStr) || null;
}

export function parseTimeToSeconds(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60;
}

export function getNextPrayerCyclic(
  schedules: ScheduleDay[],
  now: Date,
  utcOffset: number
): NextPrayer | null {
  const localTime = getLocalDate(now, utcOffset);
  const localHours = localTime.getUTCHours();
  const localMinutes = localTime.getUTCMinutes();
  const localSeconds = localTime.getUTCSeconds();
  const currentTotalSeconds = localHours * 3600 + localMinutes * 60 + localSeconds;

  const todaySchedule = getTodaySchedule(schedules, now, utcOffset);

  // Try today's remaining prayers
  if (todaySchedule) {
    for (let i = 0; i < PRAYER_KEYS.length; i++) {
      const key = PRAYER_KEYS[i];
      const timeStr = todaySchedule[key];
      if (!timeStr) continue;

      const prayerTotalSeconds = parseTimeToSeconds(timeStr);
      if (prayerTotalSeconds > currentTotalSeconds) {
        const remainingMs = (prayerTotalSeconds - currentTotalSeconds) * 1000;
        return { name: PRAYER_NAMES[i], key, time: timeStr, remainingMs, targetMs: now.getTime() + remainingMs };
      }
    }
  }

  // All today's prayers passed → countdown to tomorrow's Imsak
  const tomorrowSchedule = getTomorrowSchedule(schedules, now, utcOffset);
  if (tomorrowSchedule && tomorrowSchedule.imsak) {
    const tomorrowImsakSeconds = parseTimeToSeconds(tomorrowSchedule.imsak);
    const secondsLeftToday = 86400 - currentTotalSeconds;
    const remainingMs = (secondsLeftToday + tomorrowImsakSeconds) * 1000;
    return {
      name: "Imsak",
      key: "imsak",
      time: tomorrowSchedule.imsak,
      remainingMs,
      isTomorrow: true,
      targetMs: now.getTime() + remainingMs,
    };
  }

  // No tomorrow data (end of month) → return null to trigger refetch
  return null;
}

// Optimization: Pre-calculate constants to avoid re-allocation in high-frequency loops.
const PADDED_TIME = Array.from({ length: 60 }, (_, i) => (i < 10 ? "0" + i : "" + i));

export function formatCountdown(ms: number): { hours: string; minutes: string; seconds: string } {
  if (ms <= 0) return { hours: "00", minutes: "00", seconds: "00" };
  const totalSeconds = (ms / 1000) | 0;
  // Optimization: use primitive math to avoid unnecessary String().padStart allocations during 1000ms loop
  const h = (totalSeconds / 3600) | 0;
  const m = ((totalSeconds % 3600) / 60) | 0;
  const s = totalSeconds % 60;
  return {
    hours: h < 60 ? PADDED_TIME[h] : (h < 10 ? "0" + h : "" + h),
    minutes: PADDED_TIME[m],
    seconds: PADDED_TIME[s],
  };
}
