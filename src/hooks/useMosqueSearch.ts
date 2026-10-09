"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import type { Mosque } from "@/types";
import { formatRadius, distanceMeters } from "@/lib/mosques";
import { MOSQUE_CACHE_MAX_AGE, roundCoord } from "@/lib/constants";
import { KEYS, read, write } from "@/lib/storage";
import { isMosqueList, isObject, parseMosques } from "@/lib/validate";
import { MESSAGES } from "@/lib/messages";
import { MOSQUE_MESSAGES, noMosquesMessage } from "@/lib/mosque-messages";

type Coords = { lat: number; lng: number };

/** Where to search, and how */
export interface SearchArea {
  coords: Coords;
  radius: number;
  /** The GPS fix's accuracy (m); null for a city's centre */
  accuracy: number | null;
  /** The coordinates come from the GPS */
  gps: boolean;
}

/** Answers further from the last search than this (m) need a new one */
const MOVED_M = 200;
/** Attempts per search when the server fails (5xx) */
const ATTEMPTS = 3;

/** Nearest first, measured from `coords` */
function byDistance(mosques: Mosque[], coords: Coords): Mosque[] {
  return mosques
    .map((m) => ({ ...m, distance: distanceMeters(coords.lat, coords.lng, m.lat, m.lng) }))
    .sort((a, b) => a.distance - b.distance);
}

function statusMessage(status: number | undefined): string {
  if (status === 502) return MOSQUE_MESSAGES.serviceBusy;
  if (status === 429) return MOSQUE_MESSAGES.tooManyRequests;
  return MOSQUE_MESSAGES.serverError;
}

/** Resolves after `ms`, or rejects as soon as `signal` aborts */
function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}

/**
 * The mosques around a place: from this device's cache when it has them, else from
 * /api/mosques. A new search cancels the one before it, so a slow answer can never
 * replace a newer one.
 */
export function useMosqueSearch(): {
  mosques: Mosque[];
  loading: boolean;
  error: string | null;
  /** Search `area`, unless the last answer still covers it */
  follow: (area: SearchArea) => void;
  /** Search `area` now, past the cache */
  refresh: (area: SearchArea) => void;
} {
  const isOffline = useStore((s) => s.isOffline);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The area of the last answer (from the cache or the server) */
  const answered = useRef<SearchArea | null>(null);
  const current = useRef<AbortController | null>(null);

  // A search still running at unmount is cancelled
  useEffect(() => () => current.current?.abort(), []);

  const search = useCallback(async (area: SearchArea, { useCache }: { useCache: boolean }) => {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    const { signal } = controller;

    if (isOffline) {
      setLoading(false);
      setError(MESSAGES.offline);
      return;
    }

    const { coords, radius } = area;
    const cacheKey = KEYS.mosques(coords.lat, coords.lng, radius);
    const show = (found: Mosque[]) => {
      // The cache is shared by places up to ~1 km apart, and the server measures from
      // rounded coordinates: measure again from this exact place
      const results = byDistance(found, coords);
      setMosques(results);
      answered.current = area;
      return results;
    };

    if (useCache) {
      const cached = read(cacheKey, isMosqueList, MOSQUE_CACHE_MAX_AGE);
      if (cached) {
        const results = show(cached);
        setError(results.length === 0 ? noMosquesMessage(formatRadius(radius)) : null);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      // Rounded coordinates match the server's precision, so nearby users share CDN entries
      const url = `/api/mosques?lat=${roundCoord(coords.lat)}&lng=${roundCoord(coords.lng)}&radius=${radius}`;
      let res: Response | null = null;
      for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        res = await fetch(url, { signal });
        if (signal.aborted) return;
        if (res.ok || res.status < 500) break;
        if (attempt < ATTEMPTS - 1) await pause(1000 * (attempt + 1), signal);
      }
      if (!res || !res.ok) {
        setError(statusMessage(res?.status));
        return;
      }
      const data: unknown = await res.json();
      if (signal.aborted) return;

      const found = parseMosques(data);
      if (!found) {
        setError(isObject(data) && typeof data.error === "string" ? data.error : MOSQUE_MESSAGES.failed);
        return;
      }
      const results = show(found);
      write(cacheKey, results);
      if (results.length === 0) setError(noMosquesMessage(formatRadius(radius)));
    } catch {
      if (!signal.aborted) setError(MOSQUE_MESSAGES.connectionFailed);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [isOffline]);

  const follow = useCallback((area: SearchArea) => {
    const last = answered.current;
    // From a city's centre to the GPS position: always a new search, past the cache
    const toGps = area.gps && last !== null && !last.gps;
    if (last && !toGps) {
      const moved = distanceMeters(last.coords.lat, last.coords.lng, area.coords.lat, area.coords.lng);
      const sharper = last.accuracy !== null && area.accuracy !== null && area.accuracy < last.accuracy * 0.5;
      if (moved < MOVED_M && !sharper && area.radius === last.radius) return;
    }
    search(area, { useCache: !toGps });
  }, [search]);

  const refresh = useCallback((area: SearchArea) => {
    search(area, { useCache: false });
  }, [search]);

  return { mosques, loading, error, follow, refresh };
}
