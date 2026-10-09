"use client";

import { memo } from "react";
import { MONTH_NAMES } from "@/lib/city-time";
import { TIME_COLUMNS, type TableDay } from "./schedule-days";

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

/** One day; renders again only when its day, row number or being today changes */
const ScheduleRow = memo(function ScheduleRow({ day, index, isToday }: { day: TableDay; index: number; isToday: boolean }) {
  return (
    <tr
      aria-current={isToday ? "date" : undefined}
      className={`border-b border-slate-50 transition-colors dark:border-slate-700/30 ${
        isToday
          ? "border-l-4 border-l-green-500 bg-green-50/80 dark:border-l-emerald-400 dark:bg-emerald-950/40"
          : index % 2 === 0
            ? "bg-white hover:bg-slate-50/50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50"
            : "bg-slate-50/30 hover:bg-slate-50/70 dark:bg-slate-800/30 dark:hover:bg-slate-700/30"
      }`}
    >
      <td className={`px-3 py-2 text-center text-xs ${isToday ? "font-bold text-green-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
        {index + 1}
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
      {TIME_COLUMNS.map((col) => (
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
          {day[col.key]}
        </td>
      ))}
    </tr>
  );
});

/** The month as a table, from the md breakpoint up */
function DesktopTable({ days, todayDate, loading, year, month }: {
  days: TableDay[];
  todayDate: string;
  /** Skeleton rows instead of days */
  loading: boolean;
  year: number;
  month: number;
}) {
  return (
    <div className="hidden md:block rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-800/80">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label={`Jadwal imsakiyah ${MONTH_NAMES[month - 1]} ${year}`}>
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
            {loading ? (
              <SkeletonRows />
            ) : (
              days.map((day, i) => <ScheduleRow key={day.date} day={day} index={i} isToday={day.date === todayDate} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(DesktopTable);
