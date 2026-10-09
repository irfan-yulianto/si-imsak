"use client";

import { create } from "zustand";
import { Location, LocationState, ScheduleDay, TimezoneLabel } from "@/types";
import { DEFAULT_LOCATION, SCHEDULE_CACHE_MAX_AGE } from "@/lib/constants";
import { BUILD_DATE, cityDate, daysInMonth, shiftMonth } from "@/lib/city-time";
import { getSchedule } from "@/lib/api";
import { getTimezone } from "@/lib/timezone";
import { KEYS, read, readJson, readRaw, remove, writeRaw } from "@/lib/storage";
import { isLocation, isScheduleData } from "@/lib/validate";

/** The saved city (client only, after mount) */
function readCachedLocation(): LocationState | null {
  const loc = readJson(KEYS.location, isLocation);
  if (!loc) return null;
  const province = loc.daerah || "";
  return { cityId: loc.id, cityName: loc.lokasi, province, timezone: getTimezone(province) };
}

/** A month cached for offline use (client only, after mount) */
function readCachedSchedule(cityId: string, year: number, month: number): ScheduleDay[] {
  return read(KEYS.schedule(cityId, year, month), isScheduleData, SCHEDULE_CACHE_MAX_AGE)?.jadwal ?? [];
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

  // Whether to show the "use your location?" prompt (no saved city, not dismissed recently)
  locationPrompt: boolean;
  setLocationPrompt: (show: boolean) => void;

  /**
   * Switch to `city` (or reload the current one) and load its current month for both
   * the table and the countdown. Every call invalidates older in-flight schedule
   * requests, so a slow response for a previous city or month can never be applied
   * under the new city's name.
   */
  loadCitySchedule: (city: Location & { daerah?: string }) => Promise<CityLoadResult>;

  // Re-fetch countdown schedule for the current month, plus next month on the
  // last day so the countdown can reach tomorrow's Imsak (used by CountdownTimer)
  refetchSchedule: () => Promise<void>;
  // Fetch schedule for a specific month (used by table month navigation)
  fetchScheduleForMonth: (year: number, month: number) => Promise<void>;
  // Internal: bumped by every table/city schedule request; only the latest may apply its result
  _fetchRequestId: number;
  // Internal: bumped only when a city load starts, so a slow GPS detection can tell
  // that the user picked a city in the meantime
  _cityToken: number;
}

export interface CityLoadResult {
  ok: boolean;
  error?: string;
  /** A newer city or month request started before this one finished; nothing was applied. */
  superseded?: boolean;
}

const OFFLINE_MESSAGE = "Anda sedang offline. Periksa koneksi internet Anda.";
const LOAD_FAILED_MESSAGE = "Gagal memuat jadwal. Coba lagi nanti.";
const LOCATION_PROMPT_INTERVAL = 7 * 24 * 3600000; // re-ask after 7 days

function loadErrorMessage(): string {
  return typeof navigator !== "undefined" && !navigator.onLine ? OFFLINE_MESSAGE : LOAD_FAILED_MESSAGE;
}

/** Show the location prompt when there is no saved city and it wasn't dismissed in the last 7 days. */
function shouldShowLocationPrompt(hasSavedLocation: boolean): boolean {
  if (hasSavedLocation) return false;
  // Without storage (some private modes) this asks on every visit
  const dismissed = Number(readRaw(KEYS.locationPromptDismissed));
  if (!dismissed) return true;
  if (Date.now() - dismissed > LOCATION_PROMPT_INTERVAL) {
    remove(KEYS.locationPromptDismissed);
    return true;
  }
  return false;
}

// Initial state must be identical on the server and on the client's first render
// (no localStorage, no "now"), otherwise React hydration fails. The page is
// prerendered at build time, so the build date in WIB — computed without the device
// time zone — stands in for "today" until hydrateFromCache() runs.
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
  viewMonth: BUILD_DATE.month,
  viewYear: BUILD_DATE.year,
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
      writeRaw(KEYS.theme, theme);
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

    const theme = readRaw(KEYS.theme) === "light" ? "light" : "dark";

    const cachedLocation = readCachedLocation();
    const location = cachedLocation ?? get().location;
    // "Today" in the city's time zone, not the device's
    const today = cityDate(Date.now() + get().timeOffset, location.timezone);
    const cachedSchedule = readCachedSchedule(location.cityId, today.year, today.month);

    set({
      theme,
      viewMonth: today.month,
      viewYear: today.year,
      todayDateStr: today.iso,
      locationPrompt: shouldShowLocationPrompt(cachedLocation !== null),
      ...(cachedLocation && { location: cachedLocation }),
      ...(cachedSchedule.length > 0 && {
        schedule: { data: cachedSchedule, loading: false, error: null },
        countdownSchedule: cachedSchedule,
      }),
    });
  },

  // Re-fetch the countdown's current month. The table is left alone unless it shows an
  // error for that same month.
  refetchSchedule: async () => {
    const { location, timeOffset } = get();
    const { cityId } = location;
    const { year, month, day } = cityDate(Date.now() + timeOffset, location.timezone);
    try {
      const res = await getSchedule(cityId, year, month);
      if (!res.status || !res.data?.jadwal) return;
      let jadwal = res.data.jadwal;

      // Last day of the month: after Isya the countdown targets tomorrow's Imsak,
      // which lives in next month's data.
      if (day === daysInMonth(year, month)) {
        const following = shiftMonth(year, month, 1);
        try {
          const next = await getSchedule(cityId, following.year, following.month);
          if (next.status && next.data?.jadwal) jadwal = [...jadwal, ...next.data.jadwal];
        } catch (e) {
          console.warn("Failed to fetch next month for countdown:", e);
        }
      }

      // Ignore the result if the user switched city meanwhile
      if (get().location.cityId !== cityId) return;
      const monthDays = res.data.jadwal;
      set((state) => {
        // A table stuck on an error for this same month (e.g. offline at startup) recovers too
        const tableFailedHere =
          state.schedule.error !== null &&
          !state.schedule.loading &&
          state.schedule.data.length === 0 &&
          state.viewYear === year &&
          state.viewMonth === month;
        return {
          countdownSchedule: jadwal,
          ...(tableFailedHere && { schedule: { data: monthDays, loading: false, error: null } }),
        };
      });
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
        const jadwal = res.data.jadwal;
        set((state) => {
          // "Coba Lagi" on the table also repairs a countdown whose first load failed
          const today = cityDate(Date.now() + state.timeOffset, state.location.timezone);
          const isCurrentMonth = today.year === year && today.month === month;
          return {
            schedule: { data: jadwal, loading: false, error: null },
            ...(isCurrentMonth && state.countdownSchedule.length === 0 && { countdownSchedule: jadwal }),
          };
        });
      } else {
        set((state) => ({ schedule: { ...state.schedule, loading: false, error: "Data tidak tersedia untuk bulan ini" } }));
      }
    } catch {
      if (get()._fetchRequestId !== requestId) return;
      const message = loadErrorMessage();
      set((state) => ({ schedule: { ...state.schedule, loading: false, error: message } }));
    }
  },

  locationPrompt: false,
  setLocationPrompt: (show) => set({ locationPrompt: show }),

  _cityToken: 0,
  loadCitySchedule: async (city) => {
    const state = get();
    const requestId = state._fetchRequestId + 1;
    const cityToken = state._cityToken + 1;
    const daerah = city.daerah || "";
    const timezone = getTimezone(daerah);
    const cityChanged = state.location.cityId !== city.id;
    const today = cityDate(Date.now() + state.timeOffset, timezone);
    const sameView = !cityChanged && state.viewYear === today.year && state.viewMonth === today.month;

    // Switch immediately: the header, countdown badge and table title show the new city
    // while it loads, and nothing from the previous city stays on screen.
    set({
      _fetchRequestId: requestId,
      _cityToken: cityToken,
      location: { cityId: city.id, cityName: city.lokasi, province: daerah, timezone },
      viewMonth: today.month,
      viewYear: today.year,
      // A city in another time zone can already be on a different date
      todayDateStr: today.iso,
      schedule: { data: sameView ? state.schedule.data : [], loading: true, error: null },
      ...(cityChanged && { countdownSchedule: [] }),
    });

    // Another city was chosen meanwhile: drop everything. Month navigation in this same
    // city only takes over the table — the countdown still needs this month.
    const cityStillCurrent = () => get()._cityToken === cityToken;
    const tableStillCurrent = () => get()._fetchRequestId === requestId;

    try {
      const res = await getSchedule(city.id, today.year, today.month);
      if (!cityStillCurrent()) return { ok: false, superseded: true };
      if (res.status && res.data?.jadwal) {
        const jadwal = res.data.jadwal;
        // The response carries the canonical province name — it decides the timezone
        const province = res.data.daerah || daerah;
        set({
          location: { cityId: city.id, cityName: city.lokasi, province, timezone: getTimezone(province) },
          countdownSchedule: jadwal,
          ...(tableStillCurrent() && { schedule: { data: jadwal, loading: false, error: null } }),
        });
        return { ok: true };
      }
      const error = "Data jadwal tidak tersedia";
      if (tableStillCurrent()) set((s) => ({ schedule: { ...s.schedule, loading: false, error } }));
      return { ok: false, error };
    } catch {
      if (!cityStillCurrent()) return { ok: false, superseded: true };
      const error = loadErrorMessage();
      if (tableStillCurrent()) set((s) => ({ schedule: { ...s.schedule, loading: false, error } }));
      return { ok: false, error };
    }
  },
}));
