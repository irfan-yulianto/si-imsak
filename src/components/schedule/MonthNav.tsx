"use client";

import { useStore } from "@/store/useStore";
import { useCityToday } from "@/hooks/useCityClock";
import { getHijriMonthsForGregorianMonth } from "@/lib/hijri";
import { getScheduleYearRange } from "@/lib/constants";
import { MONTH_NAMES, shiftMonth } from "@/lib/city-time";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icons";
import { isMonthOf } from "./schedule-days";

const ARROW_CLASS =
  "flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700";

/** The month on screen, its Hijri months, and the way to the months around it */
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
    <div className="mb-3 flex items-center justify-between">
      <button type="button" onClick={() => goTo(-1)} disabled={!canGoPrev} className={ARROW_CLASS} aria-label="Bulan sebelumnya">
        <ChevronLeftIcon size={16} />
      </button>

      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </h2>
          {!isMonthOf(today, viewYear, viewMonth) && (
            <button
              type="button"
              // The city's current month, not the device's
              onClick={() => showMonth(todayYear, Number(today.slice(5, 7)))}
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

      <button type="button" onClick={() => goTo(1)} disabled={!canGoNext} className={ARROW_CLASS} aria-label="Bulan berikutnya">
        <ChevronRightIcon size={16} />
      </button>
    </div>
  );
}
