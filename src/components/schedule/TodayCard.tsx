"use client";

import { useCountdownDays, useCurrentMonth } from "@/hooks/useSchedule";
import { useCityMinute, useCityToday } from "@/hooks/useCityClock";
import { getHijriDate } from "@/lib/hijri";
import { formatLongDate } from "@/lib/city-time";
import { PRAYER_NAMES, PRAYER_KEYS } from "@/types";
import { PRAYER_ICON_MAP, CalendarIcon } from "@/components/ui/Icons";
import { useMemo } from "react";

export default function TodayCard() {
  const countdownSchedule = useCountdownDays();
  const currentMonth = useCurrentMonth();
  const loading = !currentMonth || currentMonth.status === "loading";
  // Both follow the city's clock; the build date (and no time) while hydrating
  const todayDateStr = useCityToday();
  const minuteOfDay = useCityMinute();

  const todaySchedule = useMemo(
    () => countdownSchedule.find((s) => s.date === todayDateStr),
    [countdownSchedule, todayDateStr]
  );
  const hijriDate = useMemo(() => getHijriDate(todayDateStr), [todayDateStr]);

  // Each time as minutes since midnight
  const prayerMinutes = useMemo(() => {
    if (!todaySchedule) return [];
    return PRAYER_KEYS.map((key) => {
      const [h, m] = todaySchedule[key].split(":").map(Number);
      return h * 60 + m;
    });
  }, [todaySchedule]);

  // The time in progress: the last one that has begun
  let currentPrayerIdx = -1;
  if (minuteOfDay !== null) {
    for (let i = prayerMinutes.length - 1; i >= 0; i--) {
      if (minuteOfDay >= prayerMinutes[i]) {
        currentPrayerIdx = i;
        break;
      }
    }
  }

  if (!todaySchedule) {
    if (loading) {
      return (
        <div role="status" aria-label="Memuat jadwal hari ini" className="min-h-[160px] rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-800/80">
          <div className="h-9 animate-shimmer rounded-t-2xl" />
          <div className="p-4">
            <div className="mx-auto mb-3 h-4 w-40 animate-shimmer rounded" />
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 px-1 py-2.5 dark:bg-slate-700/50">
                  <div className="h-4 w-4 animate-shimmer rounded" />
                  <div className="h-2 w-8 animate-shimmer rounded" />
                  <div className="h-4 w-10 animate-shimmer rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div role="status" className="min-h-[160px] rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/80">
        <p className="text-center text-sm text-slate-600 dark:text-slate-300">
          Jadwal hari ini belum tersedia
        </p>
      </div>
    );
  }

  const dayName = todaySchedule.tanggal?.split(",")[0] || "";

  return (
    <div className="min-h-[160px] rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-800/80">
      {/* Hijri date banner */}
      {hijriDate && (
        <div className="flex items-center justify-center gap-2 rounded-t-2xl bg-gradient-to-r from-amber-50 to-amber-100/50 px-4 py-2 dark:from-amber-950/30 dark:to-amber-900/20">
          <CalendarIcon
            size={13}
            className="text-amber-700 dark:text-amber-400"
          />
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
            {hijriDate}
          </span>
        </div>
      )}

      <div className="p-4">
        <p className="mb-3 text-center text-xs text-slate-500 dark:text-slate-400">
          {dayName}, {formatLongDate(todayDateStr)}
        </p>

        {/* Prayer times — 4-col grid (2 rows on mobile, 1 row on desktop) */}
        <div
          role="region"
          aria-label="Jadwal sholat hari ini"
          className="stagger-fade-in grid grid-cols-4 gap-1.5 md:gap-2"
        >
          {PRAYER_KEYS.map((key, idx) => {
            const isActive = idx === currentPrayerIdx;
            const isPast = currentPrayerIdx >= 0 && idx < currentPrayerIdx;
            const time = todaySchedule[key];
            const Icon = PRAYER_ICON_MAP[key];

            return (
              <div
                key={key}
                aria-current={isActive ? "time" : undefined}
                className={`flex cursor-default flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition-all duration-200 md:px-2.5 ${
                  isActive
                    ? "animate-pulse-glow bg-gradient-to-b from-amber-50 to-amber-100/80 ring-2 ring-amber-300/50 dark:from-amber-900/30 dark:to-amber-800/20 dark:ring-amber-500/30"
                    : isPast
                      ? "bg-slate-50/60 opacity-75 dark:bg-slate-700/30"
                      : "bg-slate-50 hover:-translate-y-0.5 hover:bg-slate-100/80 dark:bg-slate-700/50 dark:hover:bg-slate-600/50"
                }`}
              >
                {Icon && (
                  <Icon
                    size={16}
                    className={
                      isActive
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-slate-500 dark:text-slate-400"
                    }
                  />
                )}
                <p
                  className={`text-[11px] font-semibold uppercase ${
                    isActive
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {PRAYER_NAMES[idx]}
                </p>
                <p
                  className={`font-mono text-sm font-bold ${
                    isActive
                      ? "text-amber-800 dark:text-amber-300"
                      : isPast
                        ? "text-slate-500 line-through decoration-slate-300 dark:text-slate-400 dark:decoration-slate-600"
                        : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {time || "--:--"}
                </p>
                {(isActive || isPast) && (
                  <span className="sr-only">{isActive ? "(sedang berlangsung)" : "(sudah lewat)"}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
