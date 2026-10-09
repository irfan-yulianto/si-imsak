"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useStore } from "@/store/useStore";
import { subscribeToClock } from "@/lib/clock";
import { BUILD_DATE, cityDate, citySecondsOfDay } from "@/lib/city-time";

// The server render and the hydration render use the build date (and no time of day),
// so they always match; React then renders again with the live values.

/** Today (YYYY-MM-DD) in the selected city; changes at its midnight */
export function useCityToday(): string {
  const tz = useStore((s) => s.location.timezone);
  const offset = useStore((s) => s.timeOffset);
  const getSnapshot = useCallback(() => cityDate(Date.now() + offset, tz).iso, [tz, offset]);
  return useSyncExternalStore(subscribeToClock, getSnapshot, () => BUILD_DATE.iso);
}

/** Minutes since midnight in the selected city; null until hydrated */
export function useCityMinute(): number | null {
  const tz = useStore((s) => s.location.timezone);
  const offset = useStore((s) => s.timeOffset);
  const getSnapshot = useCallback(() => Math.floor(citySecondsOfDay(Date.now() + offset, tz) / 60), [tz, offset]);
  return useSyncExternalStore(subscribeToClock, getSnapshot, () => null);
}
