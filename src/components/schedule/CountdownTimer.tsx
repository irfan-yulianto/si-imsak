"use client";

import type { Ref } from "react";
import { useStore } from "@/store/useStore";
import { useNextPrayer } from "@/hooks/useNextPrayer";
import { useCountdownTicker } from "@/hooks/useCountdownTicker";
import type { NextPrayer } from "@/lib/countdown-helpers";
import { PRAYER_ICON_MAP } from "@/components/ui/Icons";
import { MESSAGES } from "@/lib/messages";
import LocationBadge from "./LocationBadge";
import ArrivalNotice, { arrivalMessage } from "./ArrivalNotice";

const targetLabel = (next: NextPrayer) => (next.isTomorrow ? "Menuju Imsak Besok" : `Menuju Waktu ${next.name}`);

/** Hours, minutes or seconds; the digits are written by useCountdownTicker */
function Unit({ ref, label }: { ref: Ref<HTMLSpanElement>; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm md:px-5 md:py-3">
      <span ref={ref} className="font-mono text-3xl font-extrabold tracking-tight md:text-5xl">
        --
      </span>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-green-200">{label}</p>
    </div>
  );
}

const Colon = () => <span className="animate-countdown-pulse font-mono text-2xl font-bold text-green-300 md:text-4xl">:</span>;

/** The time left until `next`, and when it is */
function Countdown({ next, timezone, onDue }: { next: NextPrayer; timezone: string; onDue: () => void }) {
  const { hoursRef, minutesRef, secondsRef } = useCountdownTicker(next.targetMs, onDue);
  const Icon = PRAYER_ICON_MAP[next.key];
  const label = targetLabel(next);
  return (
    <div className="text-center">
      <div className="mb-2 flex items-center justify-center gap-2">
        <Icon size={18} className="text-amber-300" />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-200">
          {label}
        </p>
      </div>

      <div role="timer" aria-label={`Sisa waktu ${label.toLowerCase()}`} className="flex items-center justify-center gap-1.5 md:gap-2">
        <Unit ref={hoursRef} label="Jam" />
        <Colon />
        <Unit ref={minutesRef} label="Menit" />
        <Colon />
        <Unit ref={secondsRef} label="Detik" />
      </div>

      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1">
        <span className="text-sm font-bold text-amber-300">
          {next.time} {timezone}
        </span>
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
    <section aria-label="Hitung mundur waktu sholat" className="relative min-h-[220px] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-green-800 to-teal-800 p-4 text-white shadow-xl shadow-green-900/20 md:min-h-[252px] md:p-6">
      {/* Geometric pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M20 0l4 8h-8zM0 20l8-4v8zM40 20l-8 4v-8zM20 40l-4-8h8z'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10">
        <LocationBadge />

        {arrival ? (
          <ArrivalNotice arrival={arrival} />
        ) : nextPrayer ? (
          <Countdown next={nextPrayer} timezone={timezone} onDue={recheck} />
        ) : (
          <div className="py-3 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-200">
              {failed ? MESSAGES.countdownUnavailable : "Memuat Jadwal..."}
            </p>
            {failed ? (
              <p className="mt-2 text-xs text-green-200">
                {MESSAGES.countdownRetrying}
              </p>
            ) : (
              <div className="mt-3 flex justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-300 border-t-transparent" />
              </div>
            )}
          </div>
        )}
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </section>
  );
}
