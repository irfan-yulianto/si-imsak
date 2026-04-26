"use client";

import { create } from "zustand";
import { Location, ScheduleDay, TimezoneLabel } from "@/types";
import { DEFAULT_LOCATION, SCHEDULE_CACHE_MAX_AGE } from "@/lib/constants";
import { getSchedule } from "@/lib/api";
import { getTimezone } from "@/lib/timezone";

/** Sync-read cached location from localStorage for instant first render */
function getInitialLocationFromCache(): {
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
    if (!loc.id || !loc.lokasi) return null;
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

/** Sync-read cached schedule from localStorage for instant first render */
function getInitialScheduleFromCache(cityId: string): ScheduleDay[] {
  if (typeof window === "undefined") return [];
  try {
    const now = new Date();
    const key = `schedule_${cityId}_${now.getFullYear()}_${now.getMonth() + 1}`;
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

  // Re-fetch countdown schedule for current month (used by CountdownTimer)
  refetchSchedule: () => Promise<void>;
  // Fetch schedule for a specific month (used by table month navigation)
  fetchScheduleForMonth: (year: number, month: number) => Promise<void>;
  // Internal: request ID for race-condition protection in fetchScheduleForMonth
  _fetchRequestId: number;
}

const _cachedLocation = getInitialLocationFromCache();
const _cachedSchedule = _cachedLocation
  ? getInitialScheduleFromCache(_cachedLocation.cityId)
  : [];

export const useStore = create<AppState>((set, get) => ({
  // Location — hydrate from cache for instant first render, fallback to Jakarta
  location: _cachedLocation || {
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

  // Schedule (table view) — pre-filled from cache if available
  schedule: { data: _cachedSchedule, loading: _cachedSchedule.length === 0, error: null },
  setSchedule: (data) =>
    set({ schedule: { data, loading: false, error: null } }),
  setScheduleLoading: (loading) =>
    set((state) => ({ schedule: { ...state.schedule, loading, error: null } })),
  setScheduleError: (error) =>
    set((state) => ({ schedule: { ...state.schedule, loading: false, error } })),

  // Countdown schedule (always current month) — pre-filled from cache
  countdownSchedule: _cachedSchedule,
  setCountdownSchedule: (data) => set({ countdownSchedule: data }),

  // View month
  viewMonth: new Date().getMonth() + 1,
  viewYear: new Date().getFullYear(),
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

  // Theme — sync from localStorage to avoid dark→light flash
  theme: (typeof window !== "undefined" ? (() => { try { return localStorage.getItem("theme") as "light" | "dark"; } catch (e) { console.warn("Failed to get theme from localStorage:", e); return null; } })() : null) ?? "dark",
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("theme", theme); } catch (e) { console.warn("Failed to set theme in localStorage:", e); }
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
    set({ theme });
  },

  // Re-fetch countdown schedule for current month (does NOT touch table schedule)
  refetchSchedule: async () => {
    const { location } = get();
    const now = new Date();
    try {
      const res = await getSchedule(location.cityId, now.getFullYear(), now.getMonth() + 1);
      if (res.status && res.data?.jadwal) {
        set({ countdownSchedule: res.data.jadwal });
      }
    } catch (e) {
      console.warn("Failed to refetch countdown schedule:", e);
      // silently fail — countdown will retry next second
    }
  },

  // Fetch schedule for a specific month (with request ID to handle rapid navigation)
  _fetchRequestId: 0,
  fetchScheduleForMonth: async (year, month) => {
    const { location, _fetchRequestId } = get();
    const requestId = _fetchRequestId + 1;
    set({ _fetchRequestId: requestId });
    set((state) => ({ schedule: { ...state.schedule, loading: true, error: null }, viewMonth: month, viewYear: year }));
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
