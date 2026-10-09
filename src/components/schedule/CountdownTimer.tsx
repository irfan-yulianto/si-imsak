"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/store/useStore";
import { currentMonthOf, useCountdownDays, useCurrentMonth } from "@/hooks/useSchedule";
import { addDays, cityDate } from "@/lib/city-time";
import { PRAYER_ICON_MAP, MapPinIcon, RefreshIcon } from "@/components/ui/Icons";
import type { PrayerKey } from "@/types";
import { type NextPrayer, findDay, getNextPrayer, formatCountdown } from "@/lib/countdown-helpers";

// Pause between attempts to load missing countdown data: right away, then 3 s, 10 s,
// 30 s and every minute after that (only while the app is visible)
const RETRY_DELAYS_MS = [3_000, 10_000, 30_000, 60_000];
// A time missed by more than this was slept through (phone locked, tab frozen) — not announced
const STALE_ARRIVAL_MS = 60_000;

/** What to say when a time arrives — Imsak, Terbit and Dhuha aren't obligatory prayers */
export function arrivalMessage(key: PrayerKey, name: string): { title: string; subtitle: string } {
  switch (key) {
    case "imsak":
      return { title: "Waktu Imsak", subtitle: "Saatnya berhenti makan dan minum" };
    case "terbit":
      return { title: "Matahari Terbit", subtitle: "Waktu sholat Subuh telah berakhir" };
    case "dhuha":
      return { title: "Waktu Dhuha", subtitle: "Waktu sholat sunnah Dhuha telah masuk" };
    default:
      return { title: `Waktunya ${name}!`, subtitle: "Segera tunaikan sholat" };
  }
}

export default function CountdownTimer() {
  const countdownSchedule = useCountdownDays();
  const currentFailed = useCurrentMonth()?.status === "error";
  const location = useStore((s) => s.location);
  const timeOffset = useStore((s) => s.timeOffset);
  const loadCountdownMonths = useStore((s) => s.loadCountdownMonths);
  const [nextPrayer, setNextPrayer] = useState<NextPrayer | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [prayerArrived, setPrayerArrived] = useState<{ name: string; key: PrayerKey } | null>(null);
  const arrivedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // DOM refs for countdown digits — bypass React re-render on every tick
  const hoursRef = useRef<HTMLSpanElement>(null);
  const minutesRef = useRef<HTMLSpanElement>(null);
  const secondsRef = useRef<HTMLSpanElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const refreshErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDateRef = useRef<string>("");
  const refetchingRef = useRef(false);
  // Attempts to load missing data for the current city, and when the next one may start
  const retryRef = useRef({ cityId: "", attempts: 0, nextAt: 0 });
  const nextPrayerRef = useRef<NextPrayer | null>(null);
  // The latest "recompute next prayer" check, for event handlers and the 1 s tick
  const checkRef = useRef<() => void>(() => {});

  // Back online or in the foreground (phones suspend timers in the background):
  // recompute at once and retry a failed load without waiting
  useEffect(() => {
    const resume = () => {
      retryRef.current.attempts = 0;
      retryRef.current.nextAt = 0;
      checkRef.current();
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

  // Timers that outlive a render must not fire after unmount
  useEffect(() => {
    const arrivedTimer = arrivedTimerRef;
    const refreshErrorTimer = refreshErrorTimerRef;
    return () => {
      if (arrivedTimer.current) clearTimeout(arrivedTimer.current);
      if (refreshErrorTimer.current) clearTimeout(refreshErrorTimer.current);
    };
  }, []);

  const tz = location.timezone;

  const handleRefreshLocation = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError("");
    const result = await useStore.getState().detectCity();
    setIsRefreshing(false);
    if (!result.success && result.error) {
      setRefreshError(result.error);
      if (refreshErrorTimerRef.current) clearTimeout(refreshErrorTimerRef.current);
      refreshErrorTimerRef.current = setTimeout(() => setRefreshError(""), 4000);
    }
  }, [isRefreshing]);

  // "Waktunya …" for 30 s. Called by whichever timer sees the time arrive first: the
  // 3 s check can get there before the 1 s tick, and would otherwise skip the announcement.
  const announceArrival = useCallback((prayer: NextPrayer) => {
    if (hoursRef.current) hoursRef.current.textContent = "00";
    if (minutesRef.current) minutesRef.current.textContent = "00";
    if (secondsRef.current) secondsRef.current.textContent = "00";
    nextPrayerRef.current = null;
    setPrayerArrived({ name: prayer.name, key: prayer.key });
    if (arrivedTimerRef.current) clearTimeout(arrivedTimerRef.current);
    arrivedTimerRef.current = setTimeout(() => setPrayerArrived(null), 30000);
  }, []);

  // Recompute which prayer is next (only when schedule/offset changes or date rolls over)
  useEffect(() => {
    // Reset stale ref immediately on schedule change (e.g. city switch)
    nextPrayerRef.current = null;

    function checkAndRefetch() {
      const nowMs = Date.now() + timeOffset;
      const currentDateStr = cityDate(nowMs, tz).iso;

      if (
        countdownSchedule.length > 0 &&
        lastDateRef.current &&
        lastDateRef.current !== currentDateStr &&
        !refetchingRef.current
      ) {
        if (!findDay(countdownSchedule, addDays(currentDateStr, 1))) {
          refetchingRef.current = true;
          loadCountdownMonths({ background: true }).finally(() => {
            refetchingRef.current = false;
          });
        }
      }
      lastDateRef.current = currentDateStr;

      const state = useStore.getState();
      const current = state.location;
      const retry = retryRef.current;
      if (retry.cityId !== current.cityId) {
        retryRef.current = { cityId: current.cityId, attempts: 0, nextAt: 0 };
        setLoadError(false);
      }

      // The current target passed since the last tick: announce it before moving on
      const previous = nextPrayerRef.current;
      if (previous) {
        const late = nowMs - previous.targetMs;
        if (late >= 0 && late <= STALE_ARRIVAL_MS) announceArrival(previous);
      }

      const next = getNextPrayer(countdownSchedule, nowMs, tz);
      if (next) {
        retryRef.current.attempts = 0;
        retryRef.current.nextAt = 0;
        setLoadError(false);
        nextPrayerRef.current = next;
        // Only re-render when the target prayer changes, not on every 3s check
        setNextPrayer((prev) =>
          prev && prev.key === next.key && prev.time === next.time && prev.isTomorrow === next.isTomorrow
            ? prev
            : next
        );
        const formatted = formatCountdown(next.remainingMs);
        if (hoursRef.current) hoursRef.current.textContent = formatted.hours;
        if (minutesRef.current) minutesRef.current.textContent = formatted.minutes;
        if (secondsRef.current) secondsRef.current.textContent = formatted.seconds;
        return;
      }

      // Nothing to count down to: today's (or tomorrow's) times are missing — the first
      // load failed, or the month ran out. Keep trying with growing pauses, but leave a
      // city load that is still running to finish first.
      nextPrayerRef.current = null;
      setNextPrayer(null);
      if (refetchingRef.current || document.visibilityState === "hidden") return;
      const month = currentMonthOf(state, currentDateStr);
      if (countdownSchedule.length === 0 && (!month || month.status === "loading")) return;
      // Retry pauses follow the device clock, not the server-corrected one
      const wallMs = Date.now();
      if (wallMs < retryRef.current.nextAt) return;
      const attempt = retryRef.current.attempts;
      retryRef.current.attempts = attempt + 1;
      retryRef.current.nextAt = wallMs + RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      // An earlier attempt already came back without today's times
      if (attempt > 0) setLoadError(true);
      refetchingRef.current = true;
      loadCountdownMonths({ background: true }).finally(() => {
        refetchingRef.current = false;
      });
    }

    checkRef.current = checkAndRefetch;
    checkAndRefetch();
    const interval = setInterval(checkAndRefetch, 3000);
    return () => clearInterval(interval);
  }, [countdownSchedule, timeOffset, tz, loadCountdownMonths, announceArrival]);

  // Fast countdown tick — only updates display, no state recalculation
  useEffect(() => {
    const interval = setInterval(() => {
      const ref = nextPrayerRef.current;
      if (!ref) return;
      // Optimization: avoid allocating new Date() in the hot path
      const nowMs = Date.now() + timeOffset;

      const remainingMs = ref.targetMs - nowMs;

      if (remainingMs < -STALE_ARRIVAL_MS) {
        // Woke up long after this time passed: move on to the next one silently
        nextPrayerRef.current = null;
        checkRef.current();
        return;
      }
      if (remainingMs <= 0) {
        announceArrival(ref);
        return;
      }
      const formatted = formatCountdown(remainingMs);
      if (hoursRef.current) hoursRef.current.textContent = formatted.hours;
      if (minutesRef.current) minutesRef.current.textContent = formatted.minutes;
      if (secondsRef.current) secondsRef.current.textContent = formatted.seconds;
    }, 1000);
    return () => clearInterval(interval);
  }, [timeOffset, announceArrival]);

  const PrayerIcon = nextPrayer ? PRAYER_ICON_MAP[nextPrayer.key] : null;
  const ArrivedIcon = prayerArrived ? PRAYER_ICON_MAP[prayerArrived.key] : null;
  const arrived = prayerArrived ? arrivalMessage(prayerArrived.key, prayerArrived.name) : null;
  // No times to show: the countdown's own retries failed, or the city's first load did
  const showError = !nextPrayer && (loadError || (countdownSchedule.length === 0 && currentFailed));
  const nextLabel = nextPrayer
    ? nextPrayer.isTomorrow
      ? "Menuju Imsak Besok"
      : `Menuju Waktu ${nextPrayer.name}`
    : "";

  // One persistent live region: screen readers announce changes of the target
  // prayer and arrivals, not the per-second digits.
  const announcement = arrived
    ? `${arrived.title} ${arrived.subtitle}.`
    : nextPrayer
      ? `${nextLabel}, pukul ${nextPrayer.time} ${location.timezone}.`
      : showError
        ? "Jadwal tidak tersedia."
        : "";

  return (
    <section aria-label="Hitung mundur waktu sholat" className="relative min-h-[220px] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-green-800 to-teal-800 p-4 text-white shadow-xl shadow-green-900/20 md:min-h-[252px] md:p-6">
      {/* Geometric pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M20 0l4 8h-8zM0 20l8-4v8zM40 20l-8 4v-8zM20 40l-4-8h8z'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10">
        {/* Location badge — clickable to refresh GPS. Masked in Clarity recordings. */}
        <button
          type="button"
          data-clarity-mask="True"
          onClick={handleRefreshLocation}
          disabled={isRefreshing}
          aria-label={`${location.cityName}, ${location.province}. Perbarui lokasi dengan GPS`}
          className="focus-ring group mb-3 flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-xl bg-white/[0.07] px-3 py-2 text-left transition-all hover:bg-white/[0.12] active:scale-[0.98] disabled:opacity-60"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/20">
            <MapPinIcon size={16} className="text-green-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-semibold text-green-100">
                {location.cityName}
              </p>
              <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-bold leading-none text-green-200">
                {location.timezone}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-green-200/90">
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
          <p role="alert" className="-mt-1.5 mb-2 text-center text-xs font-medium text-red-200">
            {refreshError}
          </p>
        )}

        {prayerArrived ? (
          <div className="text-center py-2">
            <div className="mb-3 flex items-center justify-center gap-2">
              {ArrivedIcon && <ArrivedIcon size={24} className="animate-pulse-glow text-amber-300" />}
            </div>
            <p className="text-lg font-extrabold text-amber-300 md:text-xl">
              {arrived?.title}
            </p>
            <p className="mt-1 text-xs font-medium text-green-200">
              {arrived?.subtitle}
            </p>
          </div>
        ) : nextPrayer ? (
          <div className="text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              {PrayerIcon && <PrayerIcon size={18} className="text-amber-300" />}
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-200">
                {nextLabel}
              </p>
            </div>

            {/* Countdown digits — refs written directly to bypass React re-renders */}
            <div role="timer" aria-label={`Sisa waktu ${nextLabel.toLowerCase()}`} className="flex items-center justify-center gap-1.5 md:gap-2">
              <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm md:px-5 md:py-3">
                <span ref={hoursRef} className="font-mono text-3xl font-extrabold tracking-tight md:text-5xl">
                  --
                </span>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-green-200">Jam</p>
              </div>
              <span className="animate-countdown-pulse font-mono text-2xl font-bold text-green-300 md:text-4xl">:</span>
              <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm md:px-5 md:py-3">
                <span ref={minutesRef} className="font-mono text-3xl font-extrabold tracking-tight md:text-5xl">
                  --
                </span>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-green-200">Menit</p>
              </div>
              <span className="animate-countdown-pulse font-mono text-2xl font-bold text-green-300 md:text-4xl">:</span>
              <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm md:px-5 md:py-3">
                <span ref={secondsRef} className="font-mono text-3xl font-extrabold tracking-tight md:text-5xl">
                  --
                </span>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-green-200">Detik</p>
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-200">
              {showError ? "Jadwal Tidak Tersedia" : "Memuat Jadwal..."}
            </p>
            {showError ? (
              <p className="mt-2 text-xs text-green-200">
                Dicoba lagi otomatis. Periksa koneksi internet atau pilih kota lain.
              </p>
            ) : (
              <div className="mt-3 flex justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-300 border-t-transparent" />
              </div>
            )}
          </div>
        )}
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </section>
  );
}
