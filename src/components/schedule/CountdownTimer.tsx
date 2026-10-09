"use client";

import type { Ref } from "react";
import { useStore } from "@/store/useStore";
import { useNextPrayer } from "@/hooks/useNextPrayer";
import { useCountdownTicker } from "@/hooks/useCountdownTicker";
import type { NextPrayer } from "@/lib/countdown-helpers";
import { PRAYER_ICON_MAP } from "@/components/ui/Icons";
import { MESSAGES } from "@/lib/messages";
import Spinner from "@/components/ui/Spinner";
import LocationBadge from "./LocationBadge";
import ArrivalNotice, { arrivalMessage } from "./ArrivalNotice";

const targetLabel = (next: NextPrayer) => (next.isTomorrow ? "Menuju Imsak Besok" : `Menuju Waktu ${next.name}`);

/** Hours, minutes or seconds; the digits are written by useCountdownTicker */
function Unit({ ref, label }: { ref: Ref<HTMLSpanElement>; label: string }) {
  return (
    <div className="min-w-[4.5rem] rounded-tile bg-white/10 px-3 py-2 md:min-w-24 md:px-5 md:py-3">
      <span ref={ref} className="block font-mono text-3xl font-extrabold tabular-nums tracking-tight md:text-5xl">
        --
      </span>
      <p className="mt-0.5 text-2xs font-semibold uppercase tracking-wide text-on-hero-muted">{label}</p>
    </div>
  );
}

const Colon = () => <span aria-hidden="true" className="font-mono text-2xl font-bold text-on-hero-muted md:text-4xl">:</span>;

/** The time left until `next`; the heading names the prayer and when it is */
function Countdown({ next, timezone, onDue }: { next: NextPrayer; timezone: string; onDue: () => void }) {
  const { hoursRef, minutesRef, secondsRef } = useCountdownTicker(next.targetMs, onDue);
  const Icon = PRAYER_ICON_MAP[next.key];
  const label = targetLabel(next);
  return (
    <div className="text-center">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Icon size={20} className="text-amber-300" />
        <h2 className="text-base font-bold md:text-lg">{label}</h2>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-sm font-bold tabular-nums text-amber-300">
          {next.time} {timezone}
        </span>
      </div>

      <div role="timer" aria-label={`Sisa waktu ${label.toLowerCase()}`} className="flex items-center justify-center gap-1.5 md:gap-2">
        <Unit ref={hoursRef} label="Jam" />
        <Colon />
        <Unit ref={minutesRef} label="Menit" />
        <Colon />
        <Unit ref={secondsRef} label="Detik" />
      </div>
    </div>
  );
}

export default function CountdownTimer() {
  const timezone = useStore((s) => s.location.timezone);
  const { nextPrayer, arrival, failed, recheck } = useNextPrayer();
  const arrived = arrival ? arrivalMessage(arrival.key, arrival.name) : null;

  // One persistent live region: screen readers announce changes of the target
  // prayer and arrivals, not the per-second digits.
  const announcement = arrived
    ? `${arrived.title} ${arrived.subtitle}.`
    : nextPrayer
      ? `${targetLabel(nextPrayer)}, pukul ${nextPrayer.time} ${timezone}.`
      : failed
        ? "Jadwal tidak tersedia."
        : "";

  return (
    <section
      aria-label="Hitung mundur waktu sholat"
      className="relative h-full overflow-hidden rounded-card bg-gradient-to-br from-hero-from via-hero-via to-hero-to p-4 text-on-hero shadow-card md:p-6"
    >
      {/* Geometric pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M20 0l4 8h-8zM0 20l8-4v8zM40 20l-8 4v-8zM20 40l-4-8h8z'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10">
        <LocationBadge />

        {/* Every state takes the same height, so nothing below moves when it changes */}
        <div className="flex min-h-36 flex-col justify-center">
          {arrival ? (
            <ArrivalNotice arrival={arrival} />
          ) : nextPrayer ? (
            <Countdown next={nextPrayer} timezone={timezone} onDue={recheck} />
          ) : failed ? (
            <div className="text-center">
              <h2 className="text-base font-bold">{MESSAGES.countdownUnavailable}</h2>
              <p className="mt-2 text-xs text-on-hero-muted">{MESSAGES.countdownRetrying}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-on-hero-muted">
              <p className="text-sm font-semibold">Memuat jadwal…</p>
              <Spinner />
            </div>
          )}
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </section>
  );
}
