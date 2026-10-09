"use client";

import { useLayoutEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { formatCountdown } from "@/lib/countdown-helpers";

/** Ticks are at least this far apart, even on a clock that stands still (a test's fixed time) */
const MIN_TICK_MS = 20;

/**
 * Counts down to `targetMs` (epoch ms, server clock) in three spans, written straight to
 * the DOM: no re-render each second. Each tick lands on a whole second before the target,
 * so the digits change on time, and `onDue` runs as the target arrives — or, after the
 * phone slept, as soon as timers run again. The timer stops on unmount.
 */
export function useCountdownTicker(targetMs: number, onDue: () => void) {
  const timeOffset = useStore((s) => s.timeOffset);
  const hoursRef = useRef<HTMLSpanElement>(null);
  const minutesRef = useRef<HTMLSpanElement>(null);
  const secondsRef = useRef<HTMLSpanElement>(null);

  // A layout effect, so the digits are in place before the first paint
  useLayoutEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function tick() {
      const remainingMs = targetMs - (Date.now() + timeOffset);
      if (remainingMs <= 0) {
        onDue();
        // The next target normally replaces this one at once; until then, ask again
        timer = setTimeout(tick, 1000);
        return;
      }
      // Whole seconds left, counting the one in progress as gone: 00 during the last
      // second, and each change exactly on a whole second before the target
      const digits = formatCountdown(remainingMs - 1);
      if (hoursRef.current) hoursRef.current.textContent = digits.hours;
      if (minutesRef.current) minutesRef.current.textContent = digits.minutes;
      if (secondsRef.current) secondsRef.current.textContent = digits.seconds;
      timer = setTimeout(tick, Math.max(((remainingMs - 1) % 1000) + 1, MIN_TICK_MS));
    }
    tick();
    return () => clearTimeout(timer);
  }, [targetMs, timeOffset, onDue]);

  return { hoursRef, minutesRef, secondsRef };
}
