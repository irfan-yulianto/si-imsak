"use client";

import { memo, type RefObject } from "react";
import { TIME_COLUMNS, type TableDay } from "./schedule-days";

function SkeletonCards() {
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

/** One day; renders again only when its day, position or being today changes */
const DayCard = memo(function DayCard({ day, index, isToday, todayRef }: {
  day: TableDay;
  index: number;
  isToday: boolean;
  todayRef: RefObject<HTMLDivElement | null>;
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
        {TIME_COLUMNS.map((col) => (
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
              {day[col.key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});

/** The month as one card per day, below the md breakpoint */
function MobileCards({ days, todayDate, loading, todayRef }: {
  days: TableDay[];
  todayDate: string;
  /** Skeleton cards instead of days */
  loading: boolean;
  /** Set to today's card */
  todayRef: RefObject<HTMLDivElement | null>;
}) {
  if (loading) return <SkeletonCards />;
  return (
    <>
      {days.map((day, i) => (
        <DayCard key={day.date} day={day} index={i} isToday={day.date === todayDate} todayRef={todayRef} />
      ))}
    </>
  );
}

export default memo(MobileCards);
