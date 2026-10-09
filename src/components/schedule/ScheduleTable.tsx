"use client";

import { useStore } from "@/store/useStore";
import { getHijriParts, getHijriMonthsForGregorianMonth } from "@/lib/hijri";
import { getScheduleYearRange } from "@/lib/constants";
import { BUILD_DATE, MONTH_NAMES, monthKey, shiftMonth } from "@/lib/city-time";
import { ScheduleDay } from "@/types";
import React, { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from "@/components/ui/Icons";

const TIME_COLUMNS = [
  { key: "imsak", label: "Imsak", isImsak: true },
  { key: "subuh", label: "Subuh", isImsak: false },
  { key: "terbit", label: "Terbit", isImsak: false },
  { key: "dhuha", label: "Dhuha", isImsak: false },
  { key: "dzuhur", label: "Dzuhur", isImsak: false },
  { key: "ashar", label: "Ashar", isImsak: false },
  { key: "maghrib", label: "Maghrib", isImsak: false },
  { key: "isya", label: "Isya", isImsak: false },
] as const;

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-50 dark:border-slate-700/30">
          <td className="px-3 py-2.5"><div className="mx-auto h-4 w-6 animate-shimmer rounded" /></td>
          <td className="px-3 py-2.5"><div className="h-4 w-24 animate-shimmer rounded" /></td>
          {TIME_COLUMNS.map((col) => (
            <td key={col.key} className="px-3 py-2.5"><div className="mx-auto h-4 w-12 animate-shimmer rounded" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

function MobileSkeletonCards() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-700/50 dark:bg-slate-800/60">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-6 w-8 animate-shimmer rounded" />
            <div className="h-4 w-20 animate-shimmer rounded" />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className="rounded-lg bg-slate-50 p-1.5 dark:bg-slate-700/40">
                <div className="mx-auto mb-1 h-2 w-8 animate-shimmer rounded" />
                <div className="mx-auto h-3 w-10 animate-shimmer rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export interface ProcessedScheduleDay extends ScheduleDay {
  hijriDay: number;
  hijriMonth: string;
  dayName: string;
  dateNum: string;
}

const ScheduleDayCard = React.memo(function ScheduleDayCard({ day, index, isToday, todayRef }: {
  day: ProcessedScheduleDay;
  index: number;
  isToday: boolean;
  todayRef: React.RefObject<HTMLDivElement | null>;
}) {

  return (
    <div
      ref={isToday ? todayRef : undefined}
      aria-current={isToday ? "date" : undefined}
      className={`rounded-xl border p-3 transition-colors ${
        isToday
          ? "border-emerald-400/60 bg-emerald-50/50 ring-1 ring-emerald-400/20 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:ring-emerald-500/10"
          : index % 2 === 0
            ? "border-slate-100 bg-white dark:border-slate-700/50 dark:bg-slate-800/60"
            : "border-slate-100 bg-slate-50/50 dark:border-slate-700/50 dark:bg-slate-800/40"
      }`}
    >
      {/* Top row: day info */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-lg font-bold ${
            isToday ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"
          }`}>
            {day.dateNum}
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {day.dayName}
            </span>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              {day.hijriDay} {day.hijriMonth}
            </span>
          </div>
        </div>
        {isToday && (
          <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] font-bold text-white">
            Hari Ini
          </span>
        )}
      </div>

      {/* Prayer times: 4-column x 2-row grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {TIME_COLUMNS.map((col) => {
          const value = day[col.key as keyof typeof day] as string;
          return (
            <div key={col.key} className={`rounded-lg px-1.5 py-1.5 text-center ${
              col.isImsak
                ? "bg-amber-50 dark:bg-amber-900/20"
                : "bg-slate-50 dark:bg-slate-700/40"
            }`}>
              <p className={`text-[11px] font-semibold uppercase ${
                col.isImsak
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}>
                {col.label}
              </p>
              <p className={`font-mono text-xs font-bold ${
                col.isImsak
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-slate-700 dark:text-slate-200"
              }`}>
                {value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
});

function MonthNav({ viewMonth, viewYear, isCurrentMonth, canGoPrev, canGoNext, onPrev, onNext, onToday }: {
  viewMonth: number;
  viewYear: number;
  isCurrentMonth: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const hijriMonths = getHijriMonthsForGregorianMonth(viewYear, viewMonth);
  const hijriLabel = hijriMonths
    .map((h, i) =>
      i === hijriMonths.length - 1
        ? `${h.monthName} ${h.year}H`
        : h.monthName
    )
    .join(" – ");

  return (
    <div className="mb-3 flex items-center justify-between">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        aria-label="Bulan sebelumnya"
      >
        <ChevronLeftIcon size={16} />
      </button>

      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </h2>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={onToday}
              className="focus-ring min-h-8 cursor-pointer rounded-full bg-emerald-100 px-3 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
            >
              Hari Ini
            </button>
          )}
        </div>
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
          {hijriLabel}
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        aria-label="Bulan berikutnya"
      >
        <ChevronRightIcon size={16} />
      </button>
    </div>
  );
}

export default function ScheduleTable() {
  const schedule = useStore((s) => s.schedule);
  const viewMonth = useStore((s) => s.viewMonth);
  const viewYear = useStore((s) => s.viewYear);
  const fetchScheduleForMonth = useStore((s) => s.fetchScheduleForMonth);
  const todayRef = useRef<HTMLDivElement>(null);
  // Skeletons only on a cold load; revalidating cached data keeps it on screen
  const showSkeleton = schedule.loading && schedule.data.length === 0;
  const [todayVisible, setTodayVisible] = useState(true);

  const scrollToToday = useCallback(() => {
    todayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // todayDateStr is kept current by the countdown, so "today" rolls over at midnight
  const storeTodayDateStr = useStore((s) => s.todayDateStr);
  // Before hydration the store has no "today" yet: use the build date, which the server
  // render used too, so the first client render matches the HTML.
  const todayDate = storeTodayDateStr || BUILD_DATE.iso;

  const processedSchedule = useMemo(() => {
    return schedule.data.map(day => {
      const { day: hijriDay, monthName: hijriMonth } = getHijriParts(day.date);
      return {
        ...day,
        hijriDay,
        hijriMonth,
        dayName: day.tanggal?.split(",")[0] || "",
        dateNum: day.date.split("-")[2],
      } as ProcessedScheduleDay;
    });
  }, [schedule.data]);

  const isCurrentMonth = useMemo(
    () => todayDate.startsWith(`${monthKey(viewYear, viewMonth)}-`),
    [todayDate, viewMonth, viewYear]
  );

  useEffect(() => {
    const el = todayRef.current;
    if (!el || !isCurrentMonth) return;
    const observer = new IntersectionObserver(
      ([entry]) => setTodayVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isCurrentMonth, schedule.data.length]);

  // Floating "Hari Ini" button: only when today's card exists and is scrolled out of view
  const showTodayButton =
    isCurrentMonth && !todayVisible && !showSkeleton && processedSchedule.some((d) => d.date === todayDate);

  // Must match the range /api/schedule accepts
  const yearRange = getScheduleYearRange(Number(todayDate.slice(0, 4)));
  const canGoPrev = viewYear > yearRange.min || (viewYear === yearRange.min && viewMonth > 1);
  const canGoNext = viewYear < yearRange.max || (viewYear === yearRange.max && viewMonth < 12);

  const goToPrevMonth = useCallback(() => {
    const prev = shiftMonth(viewYear, viewMonth, -1);
    fetchScheduleForMonth(prev.year, prev.month);
  }, [viewMonth, viewYear, fetchScheduleForMonth]);

  const goToNextMonth = useCallback(() => {
    const next = shiftMonth(viewYear, viewMonth, 1);
    fetchScheduleForMonth(next.year, next.month);
  }, [viewMonth, viewYear, fetchScheduleForMonth]);

  const goToCurrentMonth = useCallback(() => {
    // The city's current month, not the device's
    fetchScheduleForMonth(Number(todayDate.slice(0, 4)), Number(todayDate.slice(5, 7)));
  }, [fetchScheduleForMonth, todayDate]);

  if (schedule.error) {
    return (
      <div className="animate-fade-in">
        <MonthNav
          viewMonth={viewMonth}
          viewYear={viewYear}
          isCurrentMonth={isCurrentMonth}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          onPrev={goToPrevMonth}
          onNext={goToNextMonth}
          onToday={goToCurrentMonth}
        />
        <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{schedule.error}</p>
          <button
            type="button"
            onClick={() => fetchScheduleForMonth(viewYear, viewMonth)}
            aria-label={`Coba lagi memuat jadwal ${MONTH_NAMES[viewMonth - 1]} ${viewYear}`}
            className="focus-ring mt-3 min-h-11 cursor-pointer rounded-lg bg-red-100 px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!schedule.loading && schedule.data.length === 0) {
    return (
      <div role="status" className="rounded-2xl border border-slate-100 bg-white p-6 text-center dark:border-slate-700/50 dark:bg-slate-800/80">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Pilih kota untuk melihat jadwal sholat.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" aria-busy={showSkeleton}>
      {showSkeleton && (
        <p role="status" className="sr-only">
          Memuat jadwal...
        </p>
      )}
      <MonthNav
        viewMonth={viewMonth}
        viewYear={viewYear}
        isCurrentMonth={isCurrentMonth}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={goToPrevMonth}
        onNext={goToNextMonth}
        onToday={goToCurrentMonth}
      />

      {/* DESKTOP: Table view */}
      <div className="hidden md:block rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label={`Jadwal imsakiyah ${MONTH_NAMES[viewMonth - 1]} ${viewYear}`}>
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/50">
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  No
                </th>
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Tanggal
                </th>
                {TIME_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`sticky top-0 z-10 whitespace-nowrap px-3 py-3 text-center text-[11px] font-bold uppercase tracking-widest ${
                      col.isImsak
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        : "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {showSkeleton ? (
                <SkeletonRows />
              ) : (
                processedSchedule.map((day, idx) => {
                  const isToday = day.date === todayDate;

                  return (
                    <tr
                      key={day.date}
                      aria-current={isToday ? "date" : undefined}
                      className={`border-b border-slate-50 transition-colors dark:border-slate-700/30 ${
                        isToday
                          ? "border-l-4 border-l-green-500 bg-green-50/80 dark:border-l-emerald-400 dark:bg-emerald-950/40"
                          : idx % 2 === 0
                            ? "bg-white hover:bg-slate-50/50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50"
                            : "bg-slate-50/30 hover:bg-slate-50/70 dark:bg-slate-800/30 dark:hover:bg-slate-700/30"
                      }`}
                    >
                      <td className={`px-3 py-2 text-center text-xs ${isToday ? "font-bold text-green-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                        {idx + 1}
                      </td>
                      <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-normal">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium ${isToday ? "text-green-800 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300"}`}>
                            {day.dayName.substring(0, 3)}, {day.dateNum}
                          </span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                            isToday ? "bg-green-200 text-green-800 dark:bg-emerald-800/50 dark:text-emerald-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          }`}>
                            {day.hijriDay}
                          </span>
                        </div>
                      </th>
                      {TIME_COLUMNS.map((col) => {
                        const value = day[col.key as keyof typeof day] as string;
                        return (
                          <td
                            key={col.key}
                            className={`px-3 py-2 text-center font-mono text-xs ${
                              col.isImsak
                                ? isToday
                                  ? "bg-amber-100/50 font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                  : "bg-amber-50/30 font-semibold text-amber-700 dark:bg-amber-900/10 dark:text-amber-400"
                                : isToday
                                  ? "font-semibold text-green-800 dark:text-emerald-300"
                                  : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {value}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE: Card-per-day view */}
      <div className="relative md:hidden space-y-2">
        {showSkeleton ? (
          <MobileSkeletonCards />
        ) : (
          processedSchedule.map((day, idx) => (
            <ScheduleDayCard
              key={day.date}
              day={day}
              index={idx}
              isToday={day.date === todayDate}
              todayRef={todayRef}
            />
          ))
        )}

        {/* Floating scroll-to-today button */}
        {showTodayButton && (
          <button
            type="button"
            onClick={scrollToToday}
            aria-label="Gulir ke jadwal hari ini"
            className="focus-ring fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-emerald-700 px-4 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-800 active:scale-95"
          >
            <CalendarIcon size={14} />
            Hari Ini
          </button>
        )}
      </div>
    </div>
  );
}
