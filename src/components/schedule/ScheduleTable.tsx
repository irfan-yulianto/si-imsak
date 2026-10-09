"use client";

import { useMemo, useRef } from "react";
import { useStore } from "@/store/useStore";
import { useViewSchedule } from "@/hooks/useSchedule";
import { useCityToday } from "@/hooks/useCityClock";
import { MONTH_NAMES } from "@/lib/city-time";
import { MESSAGES } from "@/lib/messages";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { isMonthOf, toTableDays } from "./schedule-days";
import MonthNav from "./MonthNav";
import MonthTable from "./MonthTable";
import TodayFab from "./TodayFab";

/** The month on screen, as a table, with the way to the months around it */
export default function ScheduleTable() {
  const schedule = useViewSchedule();
  const viewMonth = useStore((s) => s.viewMonth);
  const viewYear = useStore((s) => s.viewYear);
  const showMonth = useStore((s) => s.showMonth);
  const location = useStore((s) => s.location);
  // The city's today; the build date in the server render and while hydrating
  const todayDate = useCityToday();
  const todayRef = useRef<HTMLTableRowElement>(null);
  // Skeletons only on a cold load; revalidating cached data keeps it on screen
  const showSkeleton = schedule.loading && schedule.data.length === 0;

  const days = useMemo(() => toTableDays(schedule.data), [schedule.data]);
  const todayShown = isMonthOf(todayDate, viewYear, viewMonth) && !showSkeleton && days.some((d) => d.date === todayDate);

  if (!schedule.error && !schedule.loading && schedule.data.length === 0) {
    return (
      <Card role="status" className="p-6 text-center">
        <p className="text-sm text-fg-muted">{MESSAGES.chooseCity}</p>
      </Card>
    );
  }

  return (
    <Card as="section" aria-labelledby="schedule-month" aria-busy={showSkeleton}>
      {showSkeleton && (
        <p role="status" className="sr-only">
          Memuat jadwal…
        </p>
      )}
      <MonthNav />
      {schedule.error ? (
        <div role="alert" className="p-6 text-center">
          <p className="text-sm text-danger">{schedule.error}</p>
          <Button
            variant="danger"
            onClick={() => showMonth(viewYear, viewMonth)}
            aria-label={`Coba lagi memuat jadwal ${MONTH_NAMES[viewMonth - 1]} ${viewYear}`}
            className="mt-3"
          >
            Coba Lagi
          </Button>
        </div>
      ) : (
        <MonthTable
          days={days}
          todayDate={todayDate}
          loading={showSkeleton}
          year={viewYear}
          month={viewMonth}
          city={`${location.cityName} (${location.timezone})`}
          todayRef={todayRef}
        />
      )}
      <TodayFab todayRef={todayRef} todayDate={todayDate} active={todayShown} />
    </Card>
  );
}
