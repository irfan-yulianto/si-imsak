"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MESSAGES } from "@/lib/messages";
import { MOSQUE_MESSAGES } from "@/lib/mosque-messages";

/** A fix this accurate (meters) ends the watch */
const GOOD_ENOUGH_M = 100;
/** The watch ends after this long, however accurate the last fix */
const MAX_WATCH_MS = 15_000;

/**
 * Follows the GPS position until a fix is accurate to 100 m, or for 15 s. Fixes improve
 * as the GPS warms up: each one is passed to `onFix` on the way.
 */
export function useGeolocationWatch(onFix: (coords: { lat: number; lng: number }, accuracy: number) => void): {
  watching: boolean;
  /** Why the position couldn't be found */
  error: string | null;
  start: () => void;
  stop: () => void;
} {
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Callbacks of a watch that has ended can still arrive: they are ignored
  const ended = useRef(true);

  const clear = useCallback(() => {
    ended.current = true;
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    clearTimeout(timer.current);
  }, []);

  const stop = useCallback(() => {
    clear();
    setWatching(false);
  }, [clear]);

  // No watch outlives the component
  useEffect(() => clear, [clear]);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError(MESSAGES.noGeolocation);
      return;
    }
    clear();
    setWatching(true);
    setError(null);
    ended.current = false;
    timer.current = setTimeout(stop, MAX_WATCH_MS);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (ended.current) return;
        onFix({ lat: pos.coords.latitude, lng: pos.coords.longitude }, pos.coords.accuracy);
        setError(null);
        if (pos.coords.accuracy <= GOOD_ENOUGH_M) stop();
      },
      (err) => {
        if (ended.current) return;
        stop();
        setError(
          err.code === err.PERMISSION_DENIED
            ? MOSQUE_MESSAGES.gpsDenied
            : err.code === err.POSITION_UNAVAILABLE
              ? MOSQUE_MESSAGES.gpsUnavailable
              : MOSQUE_MESSAGES.gpsFailed
        );
      },
      { enableHighAccuracy: true, timeout: 30_000, maximumAge: 0 }
    );
  }, [clear, stop, onFix]);

  return { watching, error, start, stop };
}
