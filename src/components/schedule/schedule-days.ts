import { PRAYER_KEYS, PRAYER_NAMES, type ScheduleDay } from "@/types";
import { getHijriParts } from "@/lib/hijri";

/** A day as the month's table and cards show it */
export interface TableDay extends ScheduleDay {
  hijriDay: number;
  hijriMonth: string;
  /** "Senin" */
  dayName: string;
  /** Day of the month, two digits */
  dateNum: string;
}

/** The time columns, in order; Imsak is set apart */
export const TIME_COLUMNS = PRAYER_KEYS.map((key, i) => ({ key, label: PRAYER_NAMES[i], isImsak: key === "imsak" }));

export function toTableDays(days: ScheduleDay[]): TableDay[] {
  return days.map((day) => {
    const { day: hijriDay, monthName: hijriMonth } = getHijriParts(day.date);
    return { ...day, hijriDay, hijriMonth, dayName: day.tanggal.split(",")[0], dateNum: day.date.slice(8, 10) };
  });
}

/** Whether `todayIso` falls in the month */
export function isMonthOf(todayIso: string, year: number, month: number): boolean {
  return Number(todayIso.slice(0, 4)) === year && Number(todayIso.slice(5, 7)) === month;
}
