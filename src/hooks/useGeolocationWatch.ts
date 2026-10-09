"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MESSAGES } from "@/lib/messages";
import { MOSQUE_MESSAGES } from "@/lib/mosque-messages";
import { distanceMeters } from "@/lib/mosques";
import type { GeoFix } from "@/types";

/** A fix this accurate (meters) ends the watch */
export const SHARP_M = 50;
/** After the first fix, the watch keeps sharpening it this long at most */
const REFINE_MS = 20_000;
/** How long the device may take for a first fix, once the permission is given */
const FIRST_FIX_MS = 20_000;
/** For browsers that never answer, e.g. when the permission prompt is dismissed */
const GIVE_UP_MS = 60_000;

/** idle: not watching; locating: no fix yet; refining: sharpening the first fix */
export type GpsStatus = "idle" | "locating" | "refining";

/**
 * A new fix is taken if it is as accurate as the best so far, or lies too far from it
 * for both to be right (the user moved). A rougher fix of the same spot is ignored.
 */
function better(best: GeoFix | null, fix: GeoFix): boolean {
  if (!best || fix.accuracy <= best.accuracy) return true;
  return distanceMeters(best.lat, best.lng, fix.lat, fix.lng) > best.accuracy + fix.accuracy;
}

/**
 * Follows the GPS position: each better fix goes to `onFix` as it comes, from the first
 * (usually within a few seconds) until one is accurate to 50 m, or for 20 s after the
 * first. The watch also ends when the page is hidden, to spare the battery.
 */
export function useGeolocationWatch(onFix: (fix: GeoFix) => void): {
  status: GpsStatus;
  /** Why the position couldn't be found */
  error: string | null;
  /** quiet: a failure leaves no message (a watch the user didn't ask for) */
  start: (options?: { quiet?: boolean }) => void;
  stop: () => void;
} {
  const [status, setStatus] = useState<GpsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const best = useRef<GeoFix | null>(null);
  const quiet = useRef(false);
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
    setStatus("idle");
  }, [clear]);

  const fail = useCallback((message: string) => {
    stop();
    if (!quiet.current) setError(message);
  }, [stop]);

  // No watch outlives the component, or runs while the page is hidden
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && !ended.current) stop();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      clear();
    };
  }, [clear, stop]);

  const start = useCallback(({ quiet: silent = false }: { quiet?: boolean } = {}) => {
    if (!navigator.geolocation) {
      if (!silent) setError(MESSAGES.noGeolocation);
      return;
    }
    clear();
    ended.current = false;
    best.current = null;
    quiet.current = silent;
    setStatus("locating");
    setError(null);
    timer.current = setTimeout(() => fail(MOSQUE_MESSAGES.gpsTimeout), GIVE_UP_MS);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (ended.current) return;
        const fix: GeoFix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          at: pos.timestamp || Date.now(),
        };
        if (!better(best.current, fix)) return;
        const first = best.current === null;
        best.current = fix;
        onFix(fix);
        if (fix.accuracy <= SHARP_M) return stop();
        if (first) {
          setStatus("refining");
          clearTimeout(timer.current);
          timer.current = setTimeout(stop, REFINE_MS);
        }
      },
      (err) => {
        if (ended.current) return;
        if (err.code === err.PERMISSION_DENIED) return fail(MOSQUE_MESSAGES.gpsDenied);
        // Once there is a fix, a later failure takes nothing away
        if (best.current) return;
        fail(
          err.code === err.TIMEOUT
            ? MOSQUE_MESSAGES.gpsTimeout
            : err.code === err.POSITION_UNAVAILABLE
              ? MOSQUE_MESSAGES.gpsUnavailable
              : MOSQUE_MESSAGES.gpsFailed
        );
      },
      // A fix up to 30 s old is good enough to start with: the first answer comes sooner
      { enableHighAccuracy: true, timeout: FIRST_FIX_MS, maximumAge: 30_000 }
    );
  }, [clear, stop, fail, onFix]);

  return { status, error, start, stop };
}
