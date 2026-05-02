"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/store/useStore";
import { syncServerTime, getAdjustedTime } from "@/lib/time";
import { getUtcOffset } from "@/lib/timezone";
import { PRAYER_ICON_MAP, MapPinIcon, RefreshIcon } from "@/components/ui/Icons";
import { detectAndUpdateLocation } from "@/lib/detect-location";
import {
  type NextPrayer,
  getLocalDate,
  getDateStr,
  getTomorrowSchedule,
  getNextPrayerCyclic,
  formatCountdown,
} from "@/lib/countdown-helpers";

export default function CountdownTimer() {
  const countdownSchedule = useStore((s) => s.countdownSchedule);
  const location = useStore((s) => s.location);
  const timeOffset = useStore((s) => s.timeOffset);
  const setTimeOffset = useStore((s) => s.setTimeOffset);
  const refetchSchedule = useStore((s) => s.refetchSchedule);
  const [nextPrayer, setNextPrayer] = useState<NextPrayer | null>(null);
  const [loadError, setLoadError] = useState(false);
  // DOM refs for countdown digits — bypass React re-render on every tick
  const hoursRef = useRef<HTMLSpanElement>(null);
  const minutesRef = useRef<HTMLSpanElement>(null);
  const secondsRef = useRef<HTMLSpanElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const lastDateRef = useRef<string>("");
  const refetchingRef = useRef(false);
  const refetchCountRef = useRef(0);
  const nextPrayerRef = useRef<NextPrayer | null>(null);

  useEffect(() => {
    syncServerTime().then(setTimeOffset).catch(() => {});
  }, [setTimeOffset]);

  const utcOffset = getUtcOffset(location.timezone);

  const handleRefreshLocation = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError("");
    const result = await detectAndUpdateLocation();
    setIsRefreshing(false);
    if (!result.success && result.error) {
      setRefreshError(result.error);
      setTimeout(() => setRefreshError(""), 4000);
    }
  }, [isRefreshing]);

  // Recompute which prayer is next (only when schedule/offset changes or date rolls over)
  useEffect(() => {
    // Reset stale ref immediately on schedule change (e.g. city switch)
    nextPrayerRef.current = null;
    if (countdownSchedule.length === 0) return;

    function checkAndRefetch() {
      const now = getAdjustedTime(timeOffset);
      const localTime = getLocalDate(now, utcOffset);
      const currentDateStr = getDateStr(localTime);

      if (lastDateRef.current && lastDateRef.current !== currentDateStr && !refetchingRef.current) {
        const tomorrowSchedule = getTomorrowSchedule(countdownSchedule, now, utcOffset);
        if (!tomorrowSchedule) {
          refetchingRef.current = true;
          refetchSchedule().finally(() => {
            refetchingRef.current = false;
          });
        }
      }
      lastDateRef.current = currentDateStr;

      const next = getNextPrayerCyclic(countdownSchedule, now, utcOffset);
      if (next) {
        refetchCountRef.current = 0;
        setLoadError(false);
        nextPrayerRef.current = next;
        setNextPrayer(next);
        const formatted = formatCountdown(next.remainingMs);
        if (hoursRef.current) hoursRef.current.textContent = formatted.hours;
        if (minutesRef.current) minutesRef.current.textContent = formatted.minutes;
        if (secondsRef.current) secondsRef.current.textContent = formatted.seconds;
      } else if (!refetchingRef.current && refetchCountRef.current < 3) {
        refetchingRef.current = true;
        refetchCountRef.current += 1;
        refetchSchedule().finally(() => {
          refetchingRef.current = false;
        });
      } else if (refetchCountRef.current >= 3) {
        setLoadError(true);
      }
    }

    checkAndRefetch();
    // Re-check every 10s for prayer transitions and date changes
    const interval = setInterval(checkAndRefetch, 10000);
    return () => clearInterval(interval);
  }, [countdownSchedule, timeOffset, utcOffset, refetchSchedule]);

  // Fast countdown tick — only updates display, no state recalculation
  useEffect(() => {
    const interval = setInterval(() => {
      const ref = nextPrayerRef.current;
      if (!ref) return;
      const now = getAdjustedTime(timeOffset);
      const remainingMs = ref.targetTimeMs - now.getTime();

      if (remainingMs <= 0) {
        // Prayer time reached — show 00:00:00 and clear ref to trigger recomputation
        if (hoursRef.current) hoursRef.current.textContent = "00";
        if (minutesRef.current) minutesRef.current.textContent = "00";
        if (secondsRef.current) secondsRef.current.textContent = "00";
        nextPrayerRef.current = null;
        return;
      }
      const formatted = formatCountdown(remainingMs);
      if (hoursRef.current) hoursRef.current.textContent = formatted.hours;
      if (minutesRef.current) minutesRef.current.textContent = formatted.minutes;
      if (secondsRef.current) secondsRef.current.textContent = formatted.seconds;
    }, 1000);
    return () => clearInterval(interval);
  }, [timeOffset, utcOffset]);

  const PrayerIcon = nextPrayer ? PRAYER_ICON_MAP[nextPrayer.key] : null;

  return (
    <div role="timer" aria-label="Countdown waktu sholat" className="relative min-h-[220px] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-green-800 to-teal-800 p-4 text-white shadow-xl shadow-green-900/20 md:min-h-[252px] md:p-6">
      {/* Geometric pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M20 0l4 8h-8zM0 20l8-4v8zM40 20l-8 4v-8zM20 40l-4-8h8z'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10">
        {/* Location badge — clickable to refresh GPS */}
        <button
          type="button"
          onClick={handleRefreshLocation}
          disabled={isRefreshing}
          aria-label="Perbarui lokasi"
          className="group mb-3 flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-xl bg-white/[0.07] px-3 py-2 text-left transition-all hover:bg-white/[0.12] active:scale-[0.98] disabled:opacity-60"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/20">
            <MapPinIcon size={16} className="text-green-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-semibold text-green-100">
                {location.cityName}
              </p>
              <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold leading-none text-green-300">
                {location.timezone}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-green-400">
              {location.province}
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            {isRefreshing ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-green-300 border-t-transparent" />
            ) : (
              <RefreshIcon size={14} className="text-green-300/60 transition-colors group-hover:text-green-200" />
            )}
          </div>
        </button>
        {refreshError && (
          <p className="-mt-1.5 mb-2 text-center text-[10px] font-medium text-red-300">
            {refreshError}
          </p>
        )}

        {nextPrayer ? (
          <div className="text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              {PrayerIcon && <PrayerIcon size={18} className="text-amber-300" />}
              <p aria-live="polite" className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-200">
                {nextPrayer.isTomorrow ? "Menuju Imsak Besok" : `Menuju Waktu ${nextPrayer.name}`}
              </p>
            </div>

            {/* Countdown digits — refs written directly to bypass React re-renders */}
            <div className="flex items-center justify-center gap-1.5 md:gap-2">
              <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm md:px-5 md:py-3">
                <span ref={hoursRef} className="font-mono text-3xl font-extrabold tracking-tight md:text-5xl">
                  --
                </span>
                <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-green-300">Jam</p>
              </div>
              <span className="animate-countdown-pulse font-mono text-2xl font-bold text-green-300 md:text-4xl">:</span>
              <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm md:px-5 md:py-3">
                <span ref={minutesRef} className="font-mono text-3xl font-extrabold tracking-tight md:text-5xl">
                  --
                </span>
                <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-green-300">Menit</p>
              </div>
              <span className="animate-countdown-pulse font-mono text-2xl font-bold text-green-300 md:text-4xl">:</span>
              <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm md:px-5 md:py-3">
                <span ref={secondsRef} className="font-mono text-3xl font-extrabold tracking-tight md:text-5xl">
                  --
                </span>
                <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-green-300">Detik</p>
              </div>
            </div>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1">
              <span className="text-sm font-bold text-amber-300">
                {nextPrayer.time} {location.timezone}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-300">
              {loadError ? "Jadwal Tidak Tersedia" : "Memuat Jadwal..."}
            </p>
            {loadError ? (
              <p className="mt-2 text-[10px] text-green-400/70">
                Coba pilih lokasi atau periksa koneksi internet
              </p>
            ) : (
              <div className="mt-3 flex justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-300 border-t-transparent" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
