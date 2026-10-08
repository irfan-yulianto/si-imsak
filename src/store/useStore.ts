"use client";

import { create } from "zustand";
import { Location, ScheduleDay, TimezoneLabel } from "@/types";
import { BUILD_TIME, DEFAULT_LOCATION, SCHEDULE_CACHE_MAX_AGE, TIMEZONE_OFFSETS } from "@/lib/constants";
import { getSchedule } from "@/lib/api";
import { getTimezone } from "@/lib/timezone";

/** Read the cached location from localStorage (client only, after mount) */
function readCachedLocation(): {
  cityId: string;
  cityName: string;
  province: string;
  timezone: TimezoneLabel;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("selectedLocation");
    if (!raw) return null;
    const loc: Location & { daerah?: string } = JSON.parse(raw);
    // Old v2 numeric IDs are no longer valid upstream
    if (!loc.id || !loc.lokasi || /^\d+$/.test(loc.id)) return null;
    const tz = getTimezone(loc.daerah || "");
    return {
      cityId: loc.id,
      cityName: loc.lokasi,
      province: loc.daerah || "",
      timezone: tz,
    };
  } catch (e) {
    console.warn("Failed to get initial location from localStorage:", e);
    return null;
  }
}

/** Read a cached month from localStorage (client only, after mount) */
function readCachedSchedule(cityId: string, year: number, month: number): ScheduleDay[] {
  if (typeof window === "undefined") return [];
  try {
    const key = `schedule_${cityId}_${year}_${month}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed._ts || Date.now() - parsed._ts > SCHEDULE_CACHE_MAX_AGE) return [];
    if (!parsed.data?.jadwal) return [];
    return parsed.data.jadwal;
  } catch (e) {
    console.warn("Failed to get initial schedule from localStorage:", e);
    return [];
  }
}

interface LocationState {
  cityId: string;
  cityName: string;
  province: string;
  timezone: TimezoneLabel;
}

interface ScheduleState {
  data: ScheduleDay[];
  loading: boolean;
  error: string | null;
}

interface AppState {
  // Location
  location: LocationState;
  setLocation: (loc: Location & { daerah?: string }, tz: TimezoneLabel) => void;

  // Schedule (table view — user-navigated month)
  schedule: ScheduleState;
  setSchedule: (data: ScheduleDay[]) => void;
  setScheduleLoading: (loading: boolean) => void;
  /**
   * Mark the table schedule as loading for a city/month. Data for the same
   * city/month stays visible (silent revalidation); data for anything else is
   * cleared so the table never shows one city's or month's times under another's name.
   */
  beginScheduleLoad: (cityId: string, year: number, month: number) => void;
  setScheduleError: (error: string | null) => void;

  // Countdown schedule (always current month, separate from table)
  countdownSchedule: ScheduleDay[];
  setCountdownSchedule: (data: ScheduleDay[]) => void;

  // View month (which month the schedule table is showing)
  viewMonth: number; // 1-12
  viewYear: number;
  setViewMonth: (month: number, year: number) => void;

  // Server time offset (ms)
  timeOffset: number;
  setTimeOffset: (offset: number) => void;

  // Offline mode indicator
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;

  // User coordinates (from geolocation)
  userCoords: { lat: number; lng: number } | null;
  setUserCoords: (coords: { lat: number; lng: number }) => void;

  // Theme
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;

  // Today's date (YYYY-MM-DD) in the location's timezone, kept current by the
  // countdown tick so date-based views roll over at midnight without a reload.
  todayDateStr: string;
  setTodayDateStr: (date: string) => void;

  /**
   * Load cached location, schedule and theme from localStorage. Called once after
   * mount (layout effect) so the first client render matches the server HTML.
   */
  hydrateFromCache: () => void;

  // Re-fetch countdown schedule for the current month, plus next month on the
  // last day so the countdown can reach tomorrow's Imsak (used by CountdownTimer)
  refetchSchedule: () => Promise<void>;
  // Fetch schedule for a specific month (used by table month navigation)
  fetchScheduleForMonth: (year: number, month: number) => Promise<void>;
  // Internal: request ID for race-condition protection in fetchScheduleForMonth
  _fetchRequestId: number;
}

/** Local calendar date in a WIB/WITA/WIT timezone, as UTC fields of a Date */
function localDateParts(timeOffset: number, timezone: TimezoneLabel) {
  const local = new Date(Date.now() + timeOffset + (TIMEZONE_OFFSETS[timezone] ?? 7) * 3600000);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate() };
}

// Initial state must be identical on the server and on the client's first render
// (no localStorage, no "now"), otherwise React hydration fails. The page is
// prerendered at build time, so the build timestamp — inlined into both bundles —
// stands in for "now" until hydrateFromCache() runs.
const initialView = new Date(BUILD_TIME);

export const useStore = create<AppState>((set, get) => ({
  location: {
    cityId: DEFAULT_LOCATION.id,
    cityName: DEFAULT_LOCATION.lokasi,
    province: DEFAULT_LOCATION.daerah,
    timezone: "WIB",
  },
  setLocation: (loc, tz) =>
    set({
      location: {
        cityId: loc.id,
        cityName: loc.lokasi,
        province: loc.daerah || "",
        timezone: tz,
      },
    }),

  // Schedule (table view)
  schedule: { data: [], loading: true, error: null },
  setSchedule: (data) =>
    set({ schedule: { data, loading: false, error: null } }),
  setScheduleLoading: (loading) =>
    set((state) => ({ schedule: { ...state.schedule, loading, error: null } })),
  setScheduleError: (error) =>
    set((state) => ({ schedule: { ...state.schedule, loading: false, error } })),
  beginScheduleLoad: (cityId, year, month) =>
    set((state) => {
      const sameView =
        state.location.cityId === cityId && state.viewYear === year && state.viewMonth === month;
      return { schedule: { data: sameView ? state.schedule.data : [], loading: true, error: null } };
    }),

  // Countdown schedule (current month, plus next month on its last day)
  countdownSchedule: [],
  setCountdownSchedule: (data) => set({ countdownSchedule: data }),

  // View month
  viewMonth: initialView.getMonth() + 1,
  viewYear: initialView.getFullYear(),
  setViewMonth: (month, year) => set({ viewMonth: month, viewYear: year }),

  // User coordinates
  userCoords: null,
  setUserCoords: (coords) => set({ userCoords: coords }),

  // Time
  timeOffset: 0,
  setTimeOffset: (offset) => set({ timeOffset: offset }),

  // Offline
  isOffline: false,
  setIsOffline: (offline) => set({ isOffline: offline }),

  // Theme — dark by default (matches the theme-init script in layout.tsx)
  theme: "dark",
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("theme", theme); } catch (e) { console.warn("Failed to set theme in localStorage:", e); }
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
    set({ theme });
  },

  todayDateStr: "",
  setTodayDateStr: (date) => {
    if (get().todayDateStr !== date) set({ todayDateStr: date });
  },

  hydrateFromCache: () => {
    if (typeof window === "undefined") return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let theme: "light" | "dark" = "dark";
    try {
      if (localStorage.getItem("theme") === "light") theme = "light";
    } catch (e) {
      console.warn("Failed to get theme from localStorage:", e);
    }

    const cachedLocation = readCachedLocation();
    const cityId = cachedLocation?.cityId ?? get().location.cityId;
    const cachedSchedule = readCachedSchedule(cityId, year, month);

    set({
      theme,
      viewMonth: month,
      viewYear: year,
      ...(cachedLocation && { location: cachedLocation }),
      ...(cachedSchedule.length > 0 && {
        schedule: { data: cachedSchedule, loading: false, error: null },
        countdownSchedule: cachedSchedule,
      }),
    });
  },

  // Re-fetch countdown schedule for current month (does NOT touch table schedule)
  refetchSchedule: async () => {
    const { location, timeOffset } = get();
    const { cityId } = location;
    const { year, month, day } = localDateParts(timeOffset, location.timezone);
    try {
      const res = await getSchedule(cityId, year, month);
      if (!res.status || !res.data?.jadwal) return;
      let jadwal = res.data.jadwal;

      // Last day of the month: after Isya the countdown targets tomorrow's Imsak,
      // which lives in next month's data.
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      if (day === daysInMonth) {
        const nextYear = month === 12 ? year + 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        try {
          const next = await getSchedule(cityId, nextYear, nextMonth);
          if (next.status && next.data?.jadwal) jadwal = [...jadwal, ...next.data.jadwal];
        } catch (e) {
          console.warn("Failed to fetch next month for countdown:", e);
        }
      }

      // Ignore the result if the user switched city meanwhile
      if (get().location.cityId !== cityId) return;
      set({ countdownSchedule: jadwal });
    } catch (e) {
      console.warn("Failed to refetch countdown schedule:", e);
      // silently fail — countdown retries on its next check
    }
  },

  // Fetch schedule for a specific month (with request ID to handle rapid navigation)
  _fetchRequestId: 0,
  fetchScheduleForMonth: async (year, month) => {
    const { location, _fetchRequestId } = get();
    const requestId = _fetchRequestId + 1;
    set({ _fetchRequestId: requestId });
    get().beginScheduleLoad(location.cityId, year, month);
    set({ viewMonth: month, viewYear: year });
    try {
      const res = await getSchedule(location.cityId, year, month);
      // Only apply result if this is still the latest request
      if (get()._fetchRequestId !== requestId) return;
      if (res.status && res.data?.jadwal) {
        set({ schedule: { data: res.data.jadwal, loading: false, error: null } });
      } else {
        set((state) => ({ schedule: { ...state.schedule, loading: false, error: "Data tidak tersedia untuk bulan ini" } }));
      }
    } catch {
      if (get()._fetchRequestId !== requestId) return;
      const offlineMsg = typeof navigator !== "undefined" && !navigator.onLine
        ? "Anda sedang offline. Periksa koneksi internet Anda."
        : "Gagal memuat jadwal. Coba lagi nanti.";
      set((state) => ({ schedule: { ...state.schedule, loading: false, error: offlineMsg } }));
    }
  },
}));
