import type { StateCreator } from "zustand";
import type { Location, LocationState } from "@/types";
import type { AppState } from "./useStore";
import { DEFAULT_LOCATION } from "@/lib/constants";
import { cityDate } from "@/lib/city-time";
import { getTimezone } from "@/lib/timezone";
import { reverseGeocodeCity, searchCities } from "@/lib/api";
import { KEYS, writeJson, writeRaw } from "@/lib/storage";
import { MESSAGES } from "@/lib/messages";

export interface CityLoadResult {
  ok: boolean;
  error?: string;
  /** Another city was chosen before this one finished loading; nothing was applied. */
  superseded?: boolean;
}

export interface DetectionResult {
  success: boolean;
  error?: string;
  /** The user picked a city while detection was running; their choice was kept. */
  superseded?: boolean;
}

export interface CitySlice {
  location: LocationState;
  /** Bumped by every city change: a slower answer for an earlier choice is ignored */
  cityToken: number;
  /**
   * Switch to `city` (or reload the current one): the header, countdown and table show
   * it at once, its current month loads, and the table moves to that month.
   */
  selectCity: (city: Location) => Promise<CityLoadResult>;
  /** Find the user's city from the GPS position, save it and select it */
  detectCity: () => Promise<DetectionResult>;
  /** The GPS position, once known (the mosque finder searches around it) */
  userCoords: { lat: number; lng: number } | null;
  setUserCoords: (coords: { lat: number; lng: number }) => void;
  /** Whether to ask for the location (no saved city, not dismissed recently) */
  locationPrompt: boolean;
  setLocationPrompt: (show: boolean) => void;
}

export const createCitySlice: StateCreator<AppState, [], [], CitySlice> = (set, get) => ({
  location: {
    cityId: DEFAULT_LOCATION.id,
    cityName: DEFAULT_LOCATION.lokasi,
    province: DEFAULT_LOCATION.daerah,
    timezone: "WIB",
  },
  cityToken: 0,

  selectCity: async (city) => {
    const token = get().cityToken + 1;
    const daerah = city.daerah || "";
    const timezone = getTimezone(daerah);
    // A city in another time zone can already be on a different date
    const today = cityDate(Date.now() + get().timeOffset, timezone);
    set({
      cityToken: token,
      location: { cityId: city.id, cityName: city.lokasi, province: daerah, timezone },
      viewYear: today.year,
      viewMonth: today.month,
    });

    const result = await get().loadMonth(today.year, today.month, { cityId: city.id });
    if (get().cityToken !== token) return { ok: false, superseded: true };
    if (!result.ok) return { ok: false, error: result.error };
    // The answer carries the canonical province name — it decides the time zone
    const province = result.data.daerah || daerah;
    set({ location: { cityId: city.id, cityName: city.lokasi, province, timezone: getTimezone(province) } });
    return { ok: true };
  },

  detectCity: () =>
    new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({ success: false, error: MESSAGES.noGeolocation });
        return;
      }

      // A city chosen by hand while GPS is still working wins over the detected one
      const startToken = get().cityToken;
      const superseded = () => get().cityToken !== startToken;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          get().setUserCoords({ lat: latitude, lng: longitude });

          // Reverse geocoding first, then the local table of city centres
          let geocodedCity = "";
          try {
            geocodedCity = await reverseGeocodeCity(latitude, longitude);
          } catch {}
          // The 500+ city table is only loaded when geocoding failed — keeps it out of the initial bundle
          const cityGuess = geocodedCity || (await import("@/lib/cities")).getCityGuess(latitude, longitude);
          if (!cityGuess) {
            resolve({ success: false, error: MESSAGES.cityNotDetected });
            return;
          }

          try {
            const found = await searchCities(cityGuess);
            if (superseded()) {
              resolve({ success: false, superseded: true });
              return;
            }
            if (!found.status || !found.data.length) {
              resolve({ success: false, error: MESSAGES.cityNotInDatabase });
              return;
            }
            const guess = cityGuess.toUpperCase().trim();
            const city = found.data.find((c) => c.lokasi.toUpperCase().trim() === guess) ?? found.data[0];

            writeJson(KEYS.location, city);
            writeRaw(KEYS.locationPromptDismissed, String(Date.now()));

            const result = await get().selectCity(city);
            if (result.superseded) resolve({ success: false, superseded: true });
            else if (result.ok) resolve({ success: true });
            else resolve({ success: false, error: result.error ?? MESSAGES.loadFailed });
          } catch {
            resolve({ success: false, error: MESSAGES.citySearchFailed });
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) resolve({ success: false, error: MESSAGES.permissionDenied });
          else if (error.code === error.TIMEOUT) resolve({ success: false, error: MESSAGES.detectTimeout });
          else resolve({ success: false, error: MESSAGES.detectFailed });
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    }),

  userCoords: null,
  setUserCoords: (coords) => set({ userCoords: coords }),

  locationPrompt: false,
  setLocationPrompt: (show) => set({ locationPrompt: show }),
});
