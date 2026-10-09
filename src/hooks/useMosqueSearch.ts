"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { coverageOf, distanceMeters, formatRadius, needsSearch, type MosqueAnswer } from "@/lib/mosques";
import { roundCoord } from "@/lib/constants";
import { isObject, parseMosques } from "@/lib/validate";
import { MESSAGES } from "@/lib/messages";
import { MOSQUE_MESSAGES, noMosquesMessage } from "@/lib/mosque-messages";

type Coords = { lat: number; lng: number };

/** Where to search, and how */
export interface SearchArea {
  /** The position the results are for */
  coords: Coords;
  radius: number;
  /** What the position stands for: the GPS, or a city's centre. Another basis means another search */
  basis: string;
}

/** An answer, with the basis it was asked for */
export type BasisAnswer = MosqueAnswer & { basis: string };

/** A search on its way from this close to the position is awaited, not restarted (m) */
const PENDING_NEAR_M = 200;
/** Attempts per search when the server fails (5xx) */
const ATTEMPTS = 3;

const sameSearch = (a: SearchArea, b: SearchArea) => a.basis === b.basis && a.radius === b.radius;

/** Where the server searches from: the position rounded to ~110 m, which is all it learns */
const centerOf = (coords: Coords): Coords => ({ lat: roundCoord(coords.lat), lng: roundCoord(coords.lng) });
const sameCenter = (a: Coords, b: Coords) => a.lat === b.lat && a.lng === b.lng;

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
 * The mosques around a place, from /api/mosques. `follow` is called with every new
 * position: it searches again only when the last answer can no longer tell which
 * mosques are nearest there (see needsSearch). A new search cancels the one before it,
 * so a slow answer can never replace a newer one.
 */
export function useMosqueSearch(): {
  /** The last answer, for its basis; the caller orders it from the current position */
  answer: BasisAnswer | null;
  /** A search is on its way */
  loading: boolean;
  error: string | null;
  /** Follow the position: search when the last answer doesn't cover it */
  follow: (area: SearchArea) => void;
  /** Search `area` now */
  refresh: (area: SearchArea) => void;
} {
  const isOffline = useStore((s) => s.isOffline);
  const [answer, setAnswer] = useState<BasisAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The last answer, and the area it was asked for */
  const answered = useRef<{ area: SearchArea; answer: MosqueAnswer } | null>(null);
  /** The search on its way, if any */
  const pending = useRef<{ area: SearchArea; controller: AbortController } | null>(null);
  /** The latest position followed */
  const latest = useRef<SearchArea | null>(null);

  // A search still running at unmount is cancelled
  useEffect(() => () => pending.current?.controller.abort(), []);

  const search = useCallback(async (area: SearchArea): Promise<void> => {
    pending.current?.controller.abort();
    const controller = new AbortController();
    pending.current = { area, controller };
    const { signal } = controller;

    if (isOffline) {
      pending.current = null;
      setLoading(false);
      setError(MESSAGES.offline);
      return;
    }

    setLoading(true);
    setError(null);
    // Nearby users share CDN entries too
    const center = centerOf(area.coords);
    try {
      const url = `/api/mosques?lat=${center.lat}&lng=${center.lng}&radius=${area.radius}`;
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
      // The server lists them nearest to `center` first
      const mosques = [...found].sort((a, b) => a.distance - b.distance);
      const result: MosqueAnswer = { center, radius: area.radius, coverage: coverageOf(mosques, area.radius), mosques };
      answered.current = { area, answer: result };
      setAnswer({ ...result, basis: area.basis });
      if (mosques.length === 0) setError(noMosquesMessage(formatRadius(area.radius)));
    } catch {
      if (!signal.aborted) setError(MOSQUE_MESSAGES.connectionFailed);
    } finally {
      if (pending.current?.controller === controller) {
        pending.current = null;
        setLoading(false);
      }
    }
  }, [isOffline]);

  const follow = useCallback((area: SearchArea) => {
    latest.current = area;
    const running = pending.current;
    if (
      running &&
      sameSearch(running.area, area) &&
      distanceMeters(running.area.coords.lat, running.area.coords.lng, area.coords.lat, area.coords.lng) < PENDING_NEAR_M
    ) {
      return;
    }
    const last = answered.current;
    if (
      last &&
      sameSearch(last.area, area) &&
      // From the same rounded point, the server could only say the same again
      (sameCenter(centerOf(area.coords), last.answer.center) || !needsSearch(last.answer, area.coords))
    ) {
      // The last answer still does: a search on its way for something else is moot
      if (running) {
        running.controller.abort();
        pending.current = null;
        setLoading(false);
      }
      return;
    }
    void search(area);
  }, [search]);

  const refresh = useCallback((area: SearchArea) => {
    latest.current = area;
    void search(area);
  }, [search]);

  // The position may have moved on while the answer came: look again from there
  useEffect(() => {
    if (answer && latest.current) follow(latest.current);
  }, [answer, follow]);

  return { answer, loading, error, follow, refresh };
}
