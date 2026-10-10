"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MESSAGES } from "@/lib/messages";
import { MOSQUE_MESSAGES } from "@/lib/mosque-messages";
import { SHARP_M, betterFix } from "@/lib/geofix";
import type { GeoFix } from "@/types";

/**
 * After the first reading, the watch keeps sharpening the fix this long at most. A
 * phone's GPS takes 30–60 s to lock from a cold start, longer indoors, while the first
 * reading, from Wi-Fi or the network, comes within seconds but often ±100 m. Later
 * readings don't extend the window: the battery is finite, and the button starts over.
 */
const REFINE_MS = 60_000;
/** How long the device may take for a first reading, once the permission is given */
const FIRST_FIX_MS = 20_000;
/** For browsers that never answer, e.g. when the permission prompt is dismissed */
const GIVE_UP_MS = 60_000;
/** A watch nobody asked for may begin with a reading the device took this long ago */
const CACHED_FIX_MS = 30_000;

/** idle: not watching; locating: no fix yet; refining: sharpening the fix in hand */
export type GpsStatus = "idle" | "locating" | "refining";

export interface WatchOptions {
  /** A failure leaves no message (a watch the user didn't ask for) */
  quiet?: boolean;
  /** Only readings taken from now on, none the device has from before (the user asked for an update) */
  fresh?: boolean;
  /** The fix in hand: only a reading that betters it goes to `onFix` */
  seed?: GeoFix | null;
}

/**
 * Follows the GPS position: each better reading goes to `onFix` as it comes, from the
 * first (usually within seconds) until one is accurate to 50 m, or for a minute after
 * the first. The watch also ends when the page is hidden, to spare the battery.
 */
export function useGeolocationWatch(onFix: (fix: GeoFix) => void): {
  status: GpsStatus;
  /** Why the position couldn't be found */
  error: string | null;
  /** The minute passed without a reading accurate to 50 m: the fix in hand is as good as it gets */
  settled: boolean;
  start: (options?: WatchOptions) => void;
  stop: () => void;
} {
  const [status, setStatus] = useState<GpsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const watchId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const best = useRef<GeoFix | null>(null);
  const readings = useRef(0);
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

  const end = useCallback((asGoodAsItGets: boolean) => {
    clear();
    setStatus("idle");
    setSettled(asGoodAsItGets);
  }, [clear]);

  const stop = useCallback(() => end(false), [end]);

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

  const start = useCallback(({ quiet: silent = false, fresh = false, seed = null }: WatchOptions = {}) => {
    if (!navigator.geolocation) {
      if (!silent) setError(MESSAGES.noGeolocation);
      return;
    }
    clear();
    ended.current = false;
    best.current = seed;
    readings.current = 0;
    quiet.current = silent;
    setStatus(seed ? "refining" : "locating");
    setError(null);
    setSettled(false);
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
        if (readings.current === 0) {
          // The device answers: from here it gets a minute to sharpen
          setStatus("refining");
          clearTimeout(timer.current);
          timer.current = setTimeout(() => end(true), REFINE_MS);
        }
        readings.current += 1;
        if (betterFix(best.current, fix)) {
          best.current = fix;
          onFix(fix);
        }
        // Sharp enough, be it this reading or the fix in hand: nothing left to wait for
        if (fix.accuracy <= SHARP_M) stop();
      },
      (err) => {
        if (ended.current) return;
        if (err.code === err.PERMISSION_DENIED) return fail(MOSQUE_MESSAGES.gpsDenied);
        // Once there is a reading, a later failure takes nothing away
        if (readings.current > 0) return;
        fail(
          err.code === err.TIMEOUT
            ? MOSQUE_MESSAGES.gpsTimeout
            : err.code === err.POSITION_UNAVAILABLE
              ? MOSQUE_MESSAGES.gpsUnavailable
              : MOSQUE_MESSAGES.gpsFailed
        );
      },
      { enableHighAccuracy: true, timeout: FIRST_FIX_MS, maximumAge: fresh ? 0 : CACHED_FIX_MS }
    );
  }, [clear, end, stop, fail, onFix]);

  return { status, error, settled, start, stop };
}
