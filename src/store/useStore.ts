"use client";

import { useMemo } from "react";
import { create } from "zustand";
import type { ScheduleDay } from "@/types";
import { BUILD_DATE, shiftMonth } from "@/lib/city-time";
import { createAppSlice, type AppSlice } from "./app-slice";
import { createCitySlice, type CitySlice } from "./city-slice";
import { createScheduleSlice, monthId, type MonthEntry, type ScheduleSlice } from "./schedule-slice";

export type AppState = AppSlice & CitySlice & ScheduleSlice;
export type { CityLoadResult, DetectionResult } from "./city-slice";
export type { MonthEntry } from "./schedule-slice";
export { monthId };

// Initial state must be identical on the server and on the client's first render (no
// storage, no "now"), otherwise React hydration fails. The page is prerendered at build
// time, so the build date in WIB stands in for "today" until hydrateFromCache() runs.
export const useStore = create<AppState>()((...a) => ({
  ...createAppSlice(...a),
  ...createCitySlice(...a),
  ...createScheduleSlice(...a),
  viewYear: BUILD_DATE.year,
  viewMonth: BUILD_DATE.month,
}));

const NO_DAYS: ScheduleDay[] = [];

/** The city's current month and the one after it, as monthId()s */
function countdownMonthIds(state: AppState): [string, string] {
  const today = state.todayDateStr || BUILD_DATE.iso;
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const next = shiftMonth(year, month, 1);
  return [monthId(state.location.cityId, year, month), monthId(state.location.cityId, next.year, next.month)];
}

/** The selected city's current month (what the countdown and today's card show) */
export const selectCurrentMonth = (state: AppState): MonthEntry | undefined => state.months[countdownMonthIds(state)[0]];

export function useCurrentMonth(): MonthEntry | undefined {
  return useStore(selectCurrentMonth);
}

/** The days the countdown works with: this month, and next month's once it is loaded */
export function useCountdownDays(): ScheduleDay[] {
  const current = useStore((s) => s.months[countdownMonthIds(s)[0]]?.days);
  const next = useStore((s) => s.months[countdownMonthIds(s)[1]]?.days);
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
