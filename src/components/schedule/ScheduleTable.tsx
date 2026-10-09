"use client";

import { useMemo, useRef } from "react";
import { useStore } from "@/store/useStore";
import { useViewSchedule } from "@/hooks/useSchedule";
import { useCityToday } from "@/hooks/useCityClock";
import { MONTH_NAMES } from "@/lib/city-time";
import { MESSAGES } from "@/lib/messages";
import { isMonthOf, toTableDays } from "./schedule-days";
import MonthNav from "./MonthNav";
import DesktopTable from "./DesktopTable";
import MobileCards from "./MobileCards";
import TodayFab from "./TodayFab";

/** The month on screen: a table on wide screens, a card per day on phones */
export default function ScheduleTable() {
  const schedule = useViewSchedule();
  const viewMonth = useStore((s) => s.viewMonth);
  const viewYear = useStore((s) => s.viewYear);
  const showMonth = useStore((s) => s.showMonth);
  // The city's today; the build date in the server render and while hydrating
  const todayDate = useCityToday();
  const todayRef = useRef<HTMLDivElement>(null);
  // Skeletons only on a cold load; revalidating cached data keeps it on screen
  const showSkeleton = schedule.loading && schedule.data.length === 0;

  const days = useMemo(() => toTableDays(schedule.data), [schedule.data]);
  const todayShown = isMonthOf(todayDate, viewYear, viewMonth) && !showSkeleton && days.some((d) => d.date === todayDate);

  if (schedule.error) {
    return (
      <div>
        <MonthNav />
        <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{schedule.error}</p>
          <button
            type="button"
            onClick={() => showMonth(viewYear, viewMonth)}
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
          {MESSAGES.chooseCity}
        </p>
      </div>
    );
  }

  return (
    <div aria-busy={showSkeleton}>
      {showSkeleton && (
        <p role="status" className="sr-only">
          Memuat jadwal...
        </p>
      )}
      <MonthNav />
      <DesktopTable days={days} todayDate={todayDate} loading={showSkeleton} year={viewYear} month={viewMonth} />
      <div className="relative md:hidden space-y-2">
        <MobileCards days={days} todayDate={todayDate} loading={showSkeleton} todayRef={todayRef} />
        <TodayFab todayRef={todayRef} todayDate={todayDate} active={todayShown} />
      </div>
    </div>
  );
}
