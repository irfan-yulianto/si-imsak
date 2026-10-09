"use client";

import { memo, useLayoutEffect, useRef, type RefObject } from "react";
import { MONTH_NAMES, daysInMonth, formatLongDate } from "@/lib/city-time";
import Skeleton from "@/components/ui/Skeleton";
import { cx } from "@/components/ui/cx";
import { TIME_COLUMNS, type TableDay } from "./schedule-days";

// Sticky cells need an opaque background of their own, or the times scrolling under
// them would show through
const HEAD_CELL =
  "sticky top-0 z-10 h-10 border-b border-border bg-surface px-1 text-center text-2xs font-semibold uppercase tracking-wide md:top-[calc(var(--header-h)+var(--safe-t)+0.75rem+var(--monthnav-h))]";

function Columns() {
  return (
    <colgroup>
      <col className="w-[5.5rem] md:w-36" />
      {TIME_COLUMNS.map((col) => (
        <col key={col.key} />
      ))}
    </colgroup>
  );
}

function Head() {
  return (
    <thead>
      <tr>
        <th scope="col" className={cx(HEAD_CELL, "left-0 z-20 pl-3 text-left text-fg-subtle")}>
          Tanggal
        </th>
        {TIME_COLUMNS.map((col) => (
          <th key={col.key} scope="col" className={cx(HEAD_CELL, col.isImsak ? "text-gold" : "text-fg-subtle")}>
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/** One day; renders again only when its day, stripe or being today changes */
const Row = memo(function Row({ day, odd, isToday, todayRef }: {
  day: TableDay;
  odd: boolean;
  isToday: boolean;
  todayRef: RefObject<HTMLTableRowElement | null>;
}) {
  const bg = isToday ? "bg-accent-soft" : odd ? "bg-surface-2" : "bg-surface";
  const cell = cx("h-[var(--row-h)] border-b border-border", bg);
  return (
    <tr ref={isToday ? todayRef : undefined} aria-current={isToday ? "date" : undefined}>
      <th
        scope="row"
        className={cx(
          cell,
          "sticky left-0 z-[5] whitespace-nowrap pl-3 pr-1 text-left font-normal",
          isToday && "shadow-[inset_3px_0_0_var(--accent)]"
        )}
      >
        <span className="sr-only">
          {day.dayName}, {formatLongDate(day.date)}, {day.hijriDay} {day.hijriMonth}
          {isToday && ", hari ini"}
        </span>
        <span aria-hidden="true" className="flex items-baseline gap-1.5">
          <span className={cx("text-sm font-semibold tabular-nums", isToday ? "text-accent-fg" : "text-fg")}>
            {day.dayName.slice(0, 3)} {day.dateNum}
          </span>
          <span className="text-2xs font-semibold tabular-nums text-gold">{day.hijriDay}</span>
        </span>
      </th>
      {TIME_COLUMNS.map((col) => (
        <td
          key={col.key}
          className={cx(
            cell,
            "px-1 text-center font-mono text-sm tabular-nums",
            col.isImsak ? "font-semibold text-gold" : isToday ? "font-semibold text-fg" : "text-fg-muted"
          )}
        >
          {day[col.key]}
        </td>
      ))}
    </tr>
  );
});

/**
 * The month as one table for every screen. On phones it scrolls inside its own box,
 * both ways, with the dates and the column names kept in view, and opens on today; on
 * wider screens it takes its full height, and the column names stick under the header.
 */
function MonthTable({ days, todayDate, loading, year, month, city, todayRef }: {
  days: TableDay[];
  todayDate: string;
  /** Skeleton rows, as many as the month has days */
  loading: boolean;
  year: number;
  month: number;
  /** For the caption: city and time zone */
  city: string;
  todayRef: RefObject<HTMLTableRowElement | null>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hasToday = !loading && days.some((d) => d.date === todayDate);

  // On phones the table scrolls in its own box: start with today's row in its middle
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const row = todayRef.current;
    if (!hasToday || !scroller || !row || scroller.scrollHeight <= scroller.clientHeight) return;
    scroller.scrollTop = row.offsetTop - (scroller.clientHeight - row.offsetHeight) / 2;
  }, [hasToday, year, month, todayRef]);

  return (
    <div
      ref={scrollerRef}
      role="region"
      aria-labelledby="schedule-month"
      // The box scrolls on phones: it must be reachable by keyboard to scroll it
      tabIndex={0}
      className="focus-ring max-h-[70dvh] overflow-auto overscroll-x-contain rounded-b-card md:max-h-none md:overflow-clip"
    >
      <table className="w-full min-w-[34rem] table-fixed border-separate border-spacing-0 md:min-w-0">
        <caption className="sr-only">
          Jadwal imsakiyah {MONTH_NAMES[month - 1]} {year}, {city}
        </caption>
        <Columns />
        <Head />
        <tbody>
          {loading
            ? Array.from({ length: daysInMonth(year, month) }, (_, i) => (
                <tr key={i}>
                  <td className="h-[var(--row-h)] border-b border-border pl-3">
                    <Skeleton className="h-4 w-14" />
                  </td>
                  {TIME_COLUMNS.map((col) => (
                    <td key={col.key} className="border-b border-border px-1">
                      <Skeleton className="mx-auto h-4 w-10" />
                    </td>
                  ))}
                </tr>
              ))
            : days.map((day, i) => (
                <Row key={day.date} day={day} odd={i % 2 === 1} isToday={day.date === todayDate} todayRef={todayRef} />
              ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(MonthTable);
