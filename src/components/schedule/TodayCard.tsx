"use client";

import { useCountdownDays, useCurrentMonth } from "@/hooks/useSchedule";
import { useCityMinute, useCityToday } from "@/hooks/useCityClock";
import { getHijriDate } from "@/lib/hijri";
import { formatLongDate } from "@/lib/city-time";
import { MESSAGES } from "@/lib/messages";
import { PRAYER_NAMES, PRAYER_KEYS } from "@/types";
import { PRAYER_ICON_MAP, CalendarIcon } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { cx } from "@/components/ui/cx";
import { useMemo } from "react";

/** Four times a row on phones and in the desktop column, all eight on tablets */
const TILES = "grid grid-cols-4 gap-1.5 p-3 md:grid-cols-8 md:gap-2 md:p-4 lg:grid-cols-4";

export default function TodayCard() {
  const countdownSchedule = useCountdownDays();
  const currentMonth = useCurrentMonth();
  const loading = !currentMonth || currentMonth.status === "loading";
  // Both follow the city's clock; the build date (and no time) while hydrating
  const todayDateStr = useCityToday();
  const minuteOfDay = useCityMinute();

  const todaySchedule = useMemo(
    () => countdownSchedule.find((s) => s.date === todayDateStr),
    [countdownSchedule, todayDateStr]
  );
  const hijriDate = useMemo(() => getHijriDate(todayDateStr), [todayDateStr]);

  // Each time as minutes since midnight
  const prayerMinutes = useMemo(() => {
    if (!todaySchedule) return [];
    return PRAYER_KEYS.map((key) => {
      const [h, m] = todaySchedule[key].split(":").map(Number);
      return h * 60 + m;
    });
  }, [todaySchedule]);

  // The time in progress: the last one that has begun
  let currentPrayerIdx = -1;
  if (minuteOfDay !== null) {
    for (let i = prayerMinutes.length - 1; i >= 0; i--) {
      if (minuteOfDay >= prayerMinutes[i]) {
        currentPrayerIdx = i;
        break;
      }
    }
  }

  if (!todaySchedule) {
    if (loading) {
      // The same shape as the card, so nothing moves when it fills in
      return (
        <Card role="status" aria-label="Memuat jadwal hari ini" className="h-full">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <div className={TILES}>
            {PRAYER_KEYS.map((key) => (
              <div key={key} className="flex flex-col items-center gap-1.5 rounded-tile bg-surface-2 px-1 py-2.5">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </Card>
      );
    }
    return (
      <Card role="status" className="flex h-full min-h-40 items-center justify-center p-4">
        <p className="text-center text-sm text-fg-muted">{MESSAGES.noTodaySchedule}</p>
      </Card>
    );
  }

  const dayName = todaySchedule.tanggal.split(",")[0];

  return (
    <Card className="h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">
          {dayName}, {formatLongDate(todayDateStr)}
        </h2>
        <Badge tone="gold" className="text-xs">
          <CalendarIcon size={14} />
          {hijriDate}
        </Badge>
      </div>

      <div role="region" aria-label="Jadwal sholat hari ini" className={TILES}>
        {PRAYER_KEYS.map((key, idx) => {
          const isActive = idx === currentPrayerIdx;
          const isPast = currentPrayerIdx >= 0 && idx < currentPrayerIdx;
          const Icon = PRAYER_ICON_MAP[key];
          return (
            <div
              key={key}
              aria-current={isActive ? "time" : undefined}
              className={cx(
                "flex flex-col items-center gap-1 rounded-tile px-1 py-2.5",
                isActive ? "bg-gold-soft text-gold ring-1 ring-gold/40" : "bg-surface-2",
                isPast ? "text-fg-subtle" : !isActive && "text-fg"
              )}
            >
              <Icon size={16} className={isActive ? undefined : "text-fg-subtle"} />
              <p className="text-2xs font-semibold uppercase tracking-wide">{PRAYER_NAMES[idx]}</p>
              <p className="font-mono text-sm font-bold tabular-nums">{todaySchedule[key]}</p>
              {(isActive || isPast) && (
                <span className="sr-only">{isActive ? "(sedang berlangsung)" : "(sudah lewat)"}</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
