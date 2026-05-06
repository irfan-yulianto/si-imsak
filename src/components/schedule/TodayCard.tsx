"use client";

import { useStore } from "@/store/useStore";
import { getHijriDate } from "@/lib/hijri";
import { getAdjustedTime } from "@/lib/time";
import { getUtcOffset } from "@/lib/timezone";
import { PRAYER_NAMES, PRAYER_KEYS } from "@/types";
import { PRAYER_ICON_MAP, CalendarIcon } from "@/components/ui/Icons";
import { useMemo, useState, useEffect, useRef } from "react";

export default function TodayCard() {
  const countdownSchedule = useStore((s) => s.countdownSchedule);
  const schedule = useStore((s) => s.schedule);
  const location = useStore((s) => s.location);
  const timeOffset = useStore((s) => s.timeOffset);
  const utcOffset = getUtcOffset(location.timezone);

  const { todaySchedule, hijriDate, todayDateStr } = useMemo(() => {
    const now = getAdjustedTime(timeOffset);
    const localTime = new Date(now.getTime() + utcOffset * 3600000);
    const dateStr = localTime.toISOString().split("T")[0];
    const today = countdownSchedule.find((s) => s.date === dateStr);
    const hijri = getHijriDate(dateStr);
    return { todaySchedule: today, hijriDate: hijri, todayDateStr: dateStr };
  }, [countdownSchedule, timeOffset, utcOffset]);

  // Active prayer highlight — only re-renders when prayer actually transitions
  const [currentPrayerIdx, setCurrentPrayerIdx] = useState(-1);
  const lastPrayerIdxRef = useRef(-1);

  // Pre-calculate prayer minutes to avoid parsing strings every minute in the interval
  const prayerMinutes = useMemo(() => {
    if (!todaySchedule) return [];
    return PRAYER_KEYS.map((key) => {
      const timeStr = todaySchedule[key];
      if (timeStr && timeStr.includes(":")) {
        const [h, m] = timeStr.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
      }
      return -1;
    });
  }, [todaySchedule]);

  useEffect(() => {
    function computeIdx() {
      if (!todaySchedule || prayerMinutes.length === 0) return;
      const now = getAdjustedTime(timeOffset);
      const localTime = new Date(now.getTime() + utcOffset * 3600000);
      const currentMinutes =
        localTime.getUTCHours() * 60 + localTime.getUTCMinutes();

      let newIdx = -1;
      for (let i = prayerMinutes.length - 1; i >= 0; i--) {
        if (prayerMinutes[i] !== -1 && currentMinutes >= prayerMinutes[i]) {
          newIdx = i;
          break;
        }
      }

      if (newIdx !== lastPrayerIdxRef.current) {
        lastPrayerIdxRef.current = newIdx;
        setCurrentPrayerIdx(newIdx);
      }
    }

    computeIdx();
    const interval = setInterval(computeIdx, 60000);
    return () => clearInterval(interval);
  }, [todaySchedule, timeOffset, utcOffset, prayerMinutes]);

  if (!todaySchedule) {
    return (
      <div className="min-h-[160px] rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/80">
        <p className="text-center text-sm text-slate-400 dark:text-slate-500">
          {schedule.loading
            ? "Memuat jadwal..."
            : "Jadwal hari ini belum tersedia"}
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
            className="text-amber-600 dark:text-amber-400"
          />
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
            {hijriDate}
          </span>
        </div>
      )}

      <div className="p-4">
        <p className="mb-3 text-center text-xs text-slate-500 dark:text-slate-400">
          {dayName},{" "}
          {new Date(todayDateStr + "T12:00:00").toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        {/* Prayer times — 4-col grid (2 rows on mobile, 1 row on desktop) */}
        <div
          role="region"
          aria-label="Jadwal sholat hari ini"
          className="stagger-fade-in grid grid-cols-4 gap-1.5 md:gap-2"
        >
          {PRAYER_KEYS.map((key, idx) => {
            const isActive = idx === currentPrayerIdx;
            const time = todaySchedule[key];
            const Icon = PRAYER_ICON_MAP[key];

            return (
              <div
                key={key}
                className={`flex cursor-default flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition-all duration-200 md:px-2.5 ${
                  isActive
                    ? "animate-pulse-glow bg-gradient-to-b from-amber-50 to-amber-100/80 ring-2 ring-amber-300/50 dark:from-amber-900/30 dark:to-amber-800/20 dark:ring-amber-500/30"
                    : "bg-slate-50 hover:-translate-y-0.5 hover:bg-slate-100/80 dark:bg-slate-700/50 dark:hover:bg-slate-600/50"
                }`}
              >
                {Icon && (
                  <Icon
                    size={16}
                    className={
                      isActive
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-400 dark:text-slate-500"
                    }
                  />
                )}
                <p
                  className={`text-[9px] font-semibold uppercase tracking-wider ${
                    isActive
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {PRAYER_NAMES[idx]}
                </p>
                <p
                  className={`font-mono text-sm font-bold ${
                    isActive
                      ? "text-amber-800 dark:text-amber-300"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {time || "--:--"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
