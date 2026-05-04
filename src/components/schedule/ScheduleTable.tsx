"use client";

import { useStore } from "@/store/useStore";
import { getHijriParts, getHijriMonthsForGregorianMonth } from "@/lib/hijri";
import { getAdjustedTime } from "@/lib/time";
import { getUtcOffset } from "@/lib/timezone";
import { ScheduleDay } from "@/types";
import React, { useMemo, useRef, useCallback } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icons";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

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
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              {day.hijriDay} {day.hijriMonth}
            </span>
          </div>
        </div>
        {isToday && (
          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white">
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
              <p className={`text-[8px] font-semibold uppercase tracking-wide ${
                col.isImsak
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-400 dark:text-slate-500"
              }`}>
                {col.label}
              </p>
              <p className={`font-mono text-[11px] font-bold ${
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
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
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
              className="cursor-pointer rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
            >
              Hari Ini
            </button>
          )}
        </div>
        <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
          {hijriLabel}
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        aria-label="Bulan berikutnya"
      >
        <ChevronRightIcon size={16} />
      </button>
    </div>
  );
}

export default function ScheduleTable() {
  const schedule = useStore((s) => s.schedule);
  const location = useStore((s) => s.location);
  const timeOffset = useStore((s) => s.timeOffset);
  const viewMonth = useStore((s) => s.viewMonth);
  const viewYear = useStore((s) => s.viewYear);
  const fetchScheduleForMonth = useStore((s) => s.fetchScheduleForMonth);
  const utcOffset = getUtcOffset(location.timezone);
  const todayRef = useRef<HTMLDivElement>(null);

  const todayDate = useMemo(() => {
    const now = getAdjustedTime(timeOffset);
    const localTime = new Date(now.getTime() + utcOffset * 3600000);
    return localTime.toISOString().split("T")[0];
  }, [timeOffset, utcOffset]);

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

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();
  }, [viewMonth, viewYear]);

  const canGoPrev = viewYear > 2020 || (viewYear === 2020 && viewMonth > 1);
  const canGoNext = viewYear < 2030 || (viewYear === 2030 && viewMonth < 12);

  const goToPrevMonth = useCallback(() => {
    const prev = viewMonth === 1 ? 12 : viewMonth - 1;
    const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
    fetchScheduleForMonth(prevYear, prev);
  }, [viewMonth, viewYear, fetchScheduleForMonth]);

  const goToNextMonth = useCallback(() => {
    const next = viewMonth === 12 ? 1 : viewMonth + 1;
    const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;
    fetchScheduleForMonth(nextYear, next);
  }, [viewMonth, viewYear, fetchScheduleForMonth]);

  const goToCurrentMonth = useCallback(() => {
    const n = new Date();
    fetchScheduleForMonth(n.getFullYear(), n.getMonth() + 1);
  }, [fetchScheduleForMonth]);

  // Today row is highlighted via todayRef but no auto-scroll,
  // so users land on the countdown section first.

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
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm text-red-600 dark:text-red-400">{schedule.error}</p>
          <button
            type="button"
            onClick={() => fetchScheduleForMonth(viewYear, viewMonth)}
            className="mt-3 cursor-pointer rounded-lg bg-red-100 px-4 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!schedule.loading && schedule.data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center dark:border-slate-700/50 dark:bg-slate-800/80">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pilih kota untuk melihat jadwal sholat.
        </p>
      </div>
    );
  }

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

      {/* DESKTOP: Table view */}
      <div className="hidden md:block rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label={`Jadwal imsakiyah ${MONTH_NAMES[viewMonth - 1]} ${viewYear}`}>
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/50">
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  No
                </th>
                <th className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  Tanggal
                </th>
                {TIME_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`sticky top-0 z-10 whitespace-nowrap px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest ${
                      col.isImsak
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        : "bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.loading ? (
                <SkeletonRows />
              ) : (
                processedSchedule.map((day, idx) => {
                  const isToday = day.date === todayDate;

                  return (
                    <tr
                      key={day.date}
                      className={`border-b border-slate-50 transition-colors dark:border-slate-700/30 ${
                        isToday
                          ? "border-l-4 border-l-green-500 bg-green-50/80 dark:border-l-emerald-400 dark:bg-emerald-950/40"
                          : idx % 2 === 0
                            ? "bg-white hover:bg-slate-50/50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50"
                            : "bg-slate-50/30 hover:bg-slate-50/70 dark:bg-slate-800/30 dark:hover:bg-slate-700/30"
                      }`}
                    >
                      <td className={`px-3 py-2 text-center text-xs ${isToday ? "font-bold text-green-700 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium ${isToday ? "text-green-800 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300"}`}>
                            {day.dayName.substring(0, 3)}, {day.dateNum}
                          </span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                            isToday ? "bg-green-200 text-green-800 dark:bg-emerald-800/50 dark:text-emerald-300" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                          }`}>
                            {day.hijriDay}
                          </span>
                        </div>
                      </td>
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
      <div className="md:hidden space-y-2">
        {schedule.loading ? (
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
      </div>
    </div>
  );
}
