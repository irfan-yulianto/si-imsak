"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { MapPinIcon, RefreshIcon } from "@/components/ui/Icons";
import Spinner from "@/components/ui/Spinner";

/** How long a failed refresh explains itself */
const ERROR_MS = 4_000;

/**
 * The selected city on the countdown; tapping it finds the city again by GPS. The city
 * reveals where the user is: masked in Clarity recordings.
 */
export default function LocationBadge() {
  const location = useStore((s) => s.location);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const errorTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const timer = errorTimer;
    return () => clearTimeout(timer.current);
  }, []);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError("");
    const result = await useStore.getState().detectCity();
    setRefreshing(false);
    if (!result.success && result.error) {
      setError(result.error);
      clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => setError(""), ERROR_MS);
    }
  }, [refreshing]);

  return (
    <>
      <button
        type="button"
        data-clarity-mask="True"
        onClick={refresh}
        disabled={refreshing}
        aria-label={`${location.cityName}, ${location.province}. Perbarui lokasi dengan GPS`}
        className="focus-ring group mb-3 flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-tile bg-on-hero/[0.07] px-3 py-2 text-left transition-colors hover:bg-on-hero/[0.12] disabled:opacity-60"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-on-hero/10">
          <MapPinIcon size={16} className="text-on-hero-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">
              {location.cityName}
            </p>
            <span className="shrink-0 rounded bg-on-hero/10 px-1.5 py-0.5 text-2xs font-bold leading-none text-on-hero-muted">
              {location.timezone}
            </span>
          </div>
          <p className="mt-0.5 truncate text-2xs text-on-hero-muted">
            {location.province}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          {refreshing ? (
            <Spinner size="sm" className="text-on-hero-muted" />
          ) : (
            <RefreshIcon size={16} className="text-on-hero-muted/70 transition-colors group-hover:text-on-hero" />
          )}
        </div>
      </button>
      {error && (
        <p role="alert" className="-mt-1.5 mb-2 text-center text-xs font-medium text-on-hero-danger">
          {error}
        </p>
      )}
    </>
  );
}
