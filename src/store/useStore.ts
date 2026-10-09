"use client";

import { create } from "zustand";
import { BUILD_DATE } from "@/lib/city-time";
import { createAppSlice, type AppSlice } from "./app-slice";
import { createCitySlice, type CitySlice } from "./city-slice";
import { createScheduleSlice, monthId, type ScheduleSlice } from "./schedule-slice";

export type AppState = AppSlice & CitySlice & ScheduleSlice;
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
