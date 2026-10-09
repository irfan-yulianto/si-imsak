"use client";

import { useMemo } from "react";
import type { ScheduleDay } from "@/types";
import { shiftMonth } from "@/lib/city-time";
import { monthId, useStore, type AppState, type MonthEntry } from "@/store/useStore";
import { useCityToday } from "./useCityClock";

// What the views read from the store's months

const NO_DAYS: ScheduleDay[] = [];

/** The city's month of `todayIso` and the month after, as monthId()s */
function countdownMonthIds(cityId: string, todayIso: string): [string, string] {
  const year = Number(todayIso.slice(0, 4));
  const month = Number(todayIso.slice(5, 7));
  const next = shiftMonth(year, month, 1);
  return [monthId(cityId, year, month), monthId(cityId, next.year, next.month)];
}

/** The selected city's month that contains `todayIso` */
export function currentMonthOf(state: AppState, todayIso: string): MonthEntry | undefined {
  return state.months[countdownMonthIds(state.location.cityId, todayIso)[0]];
}

/** The selected city's current month (what the countdown and today's card show) */
export function useCurrentMonth(): MonthEntry | undefined {
  const today = useCityToday();
  return useStore((s) => currentMonthOf(s, today));
}

/** The days the countdown works with: this month, and next month's once it is loaded */
export function useCountdownDays(): ScheduleDay[] {
  const today = useCityToday();
  const current = useStore((s) => s.months[countdownMonthIds(s.location.cityId, today)[0]]?.days);
  const next = useStore((s) => s.months[countdownMonthIds(s.location.cityId, today)[1]]?.days);
  return useMemo(() => (current && next ? [...current, ...next] : (current ?? next ?? NO_DAYS)), [current, next]);
}

/** The month in the table, as { data, loading, error } */
export function useViewSchedule(): { data: ScheduleDay[]; loading: boolean; error: string | null } {
  const entry = useStore((s) => s.months[monthId(s.location.cityId, s.viewYear, s.viewMonth)]);
  return useMemo(
    () => ({
      data: entry?.days ?? NO_DAYS,
      loading: !entry || entry.status === "loading",
      error: entry?.status === "error" ? entry.error : null,
    }),
    [entry]
  );
}
