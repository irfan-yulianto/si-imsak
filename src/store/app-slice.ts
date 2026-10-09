import type { StateCreator } from "zustand";
import type { LocationState } from "@/types";
import type { AppState } from "./useStore";
import { SCHEDULE_CACHE_MAX_AGE } from "@/lib/constants";
import { cityDate } from "@/lib/city-time";
import { getTimezone } from "@/lib/timezone";
import { KEYS, read, readJson, readRaw, remove, writeRaw } from "@/lib/storage";
import { isLocation, isScheduleData } from "@/lib/validate";
import { setClockOffset } from "@/lib/clock";
import { monthId } from "./schedule-slice";

export interface AppSlice {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  /** Server clock minus device clock (ms) */
  timeOffset: number;
  setTimeOffset: (offset: number) => void;
  /**
   * Load the saved city, its cached month and the theme. Called once after mount (in a
   * layout effect), so the first client render still matches the server HTML.
   */
  hydrateFromCache: () => void;
}

const LOCATION_PROMPT_INTERVAL = 7 * 24 * 3600000; // re-ask after 7 days

function readSavedCity(): LocationState | null {
  const loc = readJson(KEYS.location, isLocation);
  if (!loc) return null;
  const province = loc.daerah || "";
  return { cityId: loc.id, cityName: loc.lokasi, province, timezone: getTimezone(province) };
}

/** Ask for the location when no city is saved and the prompt wasn't dismissed in the last 7 days */
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

export const createAppSlice: StateCreator<AppState, [], [], AppSlice> = (set, get) => ({
  // Dark by default (matches the theme-init script in layout.tsx)
  theme: "dark",
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      writeRaw(KEYS.theme, theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
    set({ theme });
  },

  isOffline: false,
  setIsOffline: (offline) => set({ isOffline: offline }),

  timeOffset: 0,
  setTimeOffset: (offset) => {
    setClockOffset(offset);
    set({ timeOffset: offset });
  },

  hydrateFromCache: () => {
    if (typeof window === "undefined") return;
    const saved = readSavedCity();
    const location = saved ?? get().location;
    // "Today" in the city's time zone, not the device's
    const today = cityDate(Date.now() + get().timeOffset, location.timezone);
    const cached = read(KEYS.schedule(location.cityId, today.year, today.month), isScheduleData, SCHEDULE_CACHE_MAX_AGE);
    const id = monthId(location.cityId, today.year, today.month);

    set((s) => ({
      theme: readRaw(KEYS.theme) === "light" ? "light" : "dark",
      location,
      viewYear: today.year,
      viewMonth: today.month,
      locationPrompt: shouldShowLocationPrompt(saved !== null),
      ...(cached && cached.jadwal.length > 0 && {
        months: { ...s.months, [id]: { days: cached.jadwal, status: "ready" as const, error: null } },
      }),
    }));
  },
});
