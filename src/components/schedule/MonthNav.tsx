"use client";

import { useStore } from "@/store/useStore";
import { useCityToday } from "@/hooks/useCityClock";
import { getHijriMonthsForGregorianMonth } from "@/lib/hijri";
import { getScheduleYearRange } from "@/lib/constants";
import { MONTH_NAMES, shiftMonth } from "@/lib/city-time";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import { isMonthOf } from "./schedule-days";

/**
 * The month on screen, its Hijri months, and the way to the months around it. The top
 * bar of the schedule card; on wide screens it stays in view under the header.
 */
export default function MonthNav() {
  const viewYear = useStore((s) => s.viewYear);
  const viewMonth = useStore((s) => s.viewMonth);
  const showMonth = useStore((s) => s.showMonth);
  const today = useCityToday();
  const todayYear = Number(today.slice(0, 4));

  // The years /api/schedule accepts
  const range = getScheduleYearRange(todayYear);
  const canGoPrev = viewYear > range.min || (viewYear === range.min && viewMonth > 1);
  const canGoNext = viewYear < range.max || (viewYear === range.max && viewMonth < 12);
  const goTo = (delta: number) => {
    const target = shiftMonth(viewYear, viewMonth, delta);
    showMonth(target.year, target.month);
  };

  const hijriMonths = getHijriMonthsForGregorianMonth(viewYear, viewMonth);
  const hijriLabel = hijriMonths
    .map((h, i) => (i === hijriMonths.length - 1 ? `${h.monthName} ${h.year}H` : h.monthName))
    .join(" – ");

  return (
    <div className="z-30 flex h-[var(--monthnav-h)] items-center justify-between gap-2 rounded-t-card border-b border-border bg-surface px-2 md:sticky md:top-[calc(var(--header-h)+var(--safe-t)+0.75rem)]">
      <Button variant="secondary" size="icon" onClick={() => goTo(-1)} disabled={!canGoPrev} aria-label="Bulan sebelumnya">
        <ChevronLeftIcon size={16} />
      </Button>

      <div className="flex min-w-0 flex-col items-center">
        <div className="flex items-center gap-2">
          <h2 id="schedule-month" className="text-base font-bold text-fg">
            {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </h2>
          {!isMonthOf(today, viewYear, viewMonth) && (
            // The city's current month, not the device's
            <Button variant="soft" size="sm" pill onClick={() => showMonth(todayYear, Number(today.slice(5, 7)))}>
              Hari Ini
            </Button>
          )}
        </div>
        <p className="truncate text-xs font-medium text-gold">{hijriLabel}</p>
      </div>

      <Button variant="secondary" size="icon" onClick={() => goTo(1)} disabled={!canGoNext} aria-label="Bulan berikutnya">
        <ChevronRightIcon size={16} />
      </Button>
    </div>
  );
}
