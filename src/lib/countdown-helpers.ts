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
  const colonIdx = timeStr.indexOf(":");
  if (colonIdx === -1) return 0;
  const h = parseInt(timeStr.substring(0, colonIdx), 10);
  const m = parseInt(timeStr.substring(colonIdx + 1), 10);
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

// Pre-allocate padded strings to avoid string allocations in hot loops (1 tick/sec)
const PAD_ZEROS = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, "0"));

export function formatCountdown(ms: number): { hours: string; minutes: string; seconds: string } {
  if (ms <= 0) return { hours: "00", minutes: "00", seconds: "00" };
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return {
    hours: h < 100 ? PAD_ZEROS[h] : String(h).padStart(2, "0"),
    minutes: PAD_ZEROS[m],
    seconds: PAD_ZEROS[s],
  };
}
