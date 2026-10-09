"use client";

import { useEffect, useLayoutEffect } from "react";
import { useStore } from "@/store/useStore";
import { prepareStorage } from "@/lib/storage";
import { syncServerTime } from "@/lib/time";
import { cityDate, monthKey } from "@/lib/city-time";

const MONTH_CHECK_MS = 3_600_000;

/** The current city again, e.g. to reload its schedule */
function reloadCity() {
  const { location, selectCity } = useStore.getState();
  return selectCity({ id: location.cityId, lokasi: location.cityName, daerah: location.province });
}

/**
 * What the page does once at start-up and keeps doing while it is open: restore the
 * saved state, load the city, follow the connection, the server clock and the
 * calendar month. Called once, by the page.
 */
export function useAppBootstrap(): void {
  // Right after hydration but before the first paint: the first client render matches
  // the server HTML, and users still never see the defaults
  useLayoutEffect(() => {
    prepareStorage();
    useStore.getState().hydrateFromCache();
  }, []);

  // The saved city, or the default one
  useEffect(() => {
    reloadCity();
  }, []);

  useEffect(() => {
    const { setIsOffline } = useStore.getState();
    const update = () => setIsOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // The server's clock, and again whenever the app returns to the foreground
  useEffect(() => {
    const { setTimeOffset } = useStore.getState();
    const sync = () => {
      syncServerTime(setTimeOffset).then(setTimeOffset).catch(() => {});
    };
    sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // A new month in the city's time zone loads the city again: checked hourly, and
  // whenever the app returns to the foreground (phones suspend timers when locked)
  useEffect(() => {
    const currentMonth = () => {
      const { location, timeOffset } = useStore.getState();
      const today = cityDate(Date.now() + timeOffset, location.timezone);
      return monthKey(today.year, today.month);
    };
    let lastMonth = currentMonth();
    const checkMonth = () => {
      const month = currentMonth();
      if (month === lastMonth) return;
      lastMonth = month;
      reloadCity();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") checkMonth();
    };
    const interval = setInterval(checkMonth, MONTH_CHECK_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
