"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { currentMonthOf, useCountdownDays, useCurrentMonth } from "./useSchedule";
import { addDays, cityDate } from "@/lib/city-time";
import { type NextPrayer, findDay, getNextPrayer } from "@/lib/countdown-helpers";
import type { PrayerKey } from "@/types";

/** How often the target is worked out again, and missing data retried */
const CHECK_INTERVAL_MS = 3_000;
// Pause between attempts to load missing countdown data: right away, then 3 s, 10 s,
// 30 s and every minute after that (only while the app is visible)
const RETRY_DELAYS_MS = [3_000, 10_000, 30_000, 60_000];
// A time missed by more than this was slept through (phone locked, tab frozen) — not announced
const STALE_ARRIVAL_MS = 60_000;
/** How long an arrival stays on screen */
const ARRIVAL_MS = 30_000;

/** A time that has just arrived */
export interface Arrival {
  key: PrayerKey;
  name: string;
}

const sameTarget = (a: NextPrayer, b: NextPrayer) =>
  a.key === b.key && a.time === b.time && a.targetMs === b.targetMs && a.isTomorrow === b.isTomorrow;

/**
 * The time the countdown counts down to, in the selected city: today's next time, or
 * tomorrow's Imsak after Isya. Announces each time as it arrives (unless it passed while
 * the phone slept), and keeps loading the countdown's months while they are missing.
 */
export function useNextPrayer(): {
  /** The target; null while there is none */
  nextPrayer: NextPrayer | null;
  /** A time that arrived in the last 30 s */
  arrival: Arrival | null;
  /** There is no target, and loading the times failed */
  failed: boolean;
  /** Work the target out again now (the countdown asks when its target is due) */
  recheck: () => void;
} {
  const days = useCountdownDays();
  const currentFailed = useCurrentMonth()?.status === "error";
  const tz = useStore((s) => s.location.timezone);
  const timeOffset = useStore((s) => s.timeOffset);
  const loadCountdownMonths = useStore((s) => s.loadCountdownMonths);

  const [nextPrayer, setNextPrayer] = useState<NextPrayer | null>(null);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [loadError, setLoadError] = useState(false);

  // The target as of the latest check (the state follows a render later)
  const targetRef = useRef<NextPrayer | null>(null);
  const arrivalTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastDate = useRef("");
  const loading = useRef(false);
  // Attempts to load missing data for the current city, and when the next one may start
  const retry = useRef({ cityId: "", attempts: 0, nextAt: 0 });
  // The latest check, for the event handlers and recheck()
  const check = useRef<() => void>(() => {});

  const announce = useCallback((prayer: NextPrayer) => {
    setArrival({ key: prayer.key, name: prayer.name });
    clearTimeout(arrivalTimer.current);
    arrivalTimer.current = setTimeout(() => setArrival(null), ARRIVAL_MS);
  }, []);

  useEffect(() => {
    // New data (another city, a reload): the old target no longer counts
    targetRef.current = null;

    function load() {
      loading.current = true;
      loadCountdownMonths({ background: true }).finally(() => {
        loading.current = false;
      });
    }

    function run() {
      const nowMs = Date.now() + timeOffset;
      const today = cityDate(nowMs, tz).iso;

      // A new day: tomorrow's Imsak may be in a month that isn't loaded yet
      if (days.length > 0 && lastDate.current && lastDate.current !== today && !loading.current) {
        if (!findDay(days, addDays(today, 1))) load();
      }
      lastDate.current = today;

      const state = useStore.getState();
      const { cityId } = state.location;
      if (retry.current.cityId !== cityId) {
        retry.current = { cityId, attempts: 0, nextAt: 0 };
        setLoadError(false);
      }

      // The target passed since the last check: announce it, unless that was long ago
      const previous = targetRef.current;
      if (previous) {
        const late = nowMs - previous.targetMs;
        if (late >= 0 && late <= STALE_ARRIVAL_MS) announce(previous);
      }

      const next = getNextPrayer(days, nowMs, tz);
      targetRef.current = next;
      if (next) {
        retry.current.attempts = 0;
        retry.current.nextAt = 0;
        setLoadError(false);
        // A new object every check: keep the old one while the target is the same
        setNextPrayer((prev) => (prev && sameTarget(prev, next) ? prev : next));
        return;
      }

      // Nothing to count down to: today's (or tomorrow's) times are missing — the first
      // load failed, or the month ran out. Keep trying with growing pauses, but leave a
      // city load that is still running to finish first.
      setNextPrayer(null);
      if (loading.current || document.visibilityState === "hidden") return;
      const month = currentMonthOf(state, today);
      if (days.length === 0 && (!month || month.status === "loading")) return;
      // Retry pauses follow the device clock, not the server-corrected one
      const wallMs = Date.now();
      if (wallMs < retry.current.nextAt) return;
      const attempt = retry.current.attempts;
      retry.current.attempts = attempt + 1;
      retry.current.nextAt = wallMs + RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      // An earlier attempt already came back without today's times
      if (attempt > 0) setLoadError(true);
      load();
    }

    check.current = run;
    run();
    const interval = setInterval(run, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [days, timeOffset, tz, loadCountdownMonths, announce]);

  // Back online or in the foreground (phones suspend timers in the background):
  // check at once, and retry a failed load without waiting
  useEffect(() => {
    const resume = () => {
      retry.current.attempts = 0;
      retry.current.nextAt = 0;
      check.current();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") resume();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", resume);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", resume);
    };
  }, []);

  // The arrival's timer must not fire after unmount
  useEffect(() => {
    const timer = arrivalTimer;
    return () => clearTimeout(timer.current);
  }, []);

  const recheck = useCallback(() => check.current(), []);

  return {
    nextPrayer,
    arrival,
    failed: !nextPrayer && (loadError || (days.length === 0 && currentFailed)),
    recheck,
  };
}
