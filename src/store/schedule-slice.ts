import type { StateCreator } from "zustand";
import type { ScheduleDay } from "@/types";
import type { AppState } from "./useStore";
import { cityDate, daysInMonth, monthKey, shiftMonth } from "@/lib/city-time";
import { getSchedule } from "@/lib/api";
import type { ScheduleData } from "@/lib/validate";
import { MESSAGES, loadFailedMessage } from "@/lib/messages";

/** One month of one city */
export interface MonthEntry {
  /** The month's days; kept while it reloads */
  days: ScheduleDay[];
  status: "loading" | "ready" | "error";
  /** What the table says when the load failed */
  error: string | null;
}

export type MonthLoad = { ok: true; data: ScheduleData } | { ok: false; error: string };

export interface ScheduleSlice {
  /** Months loaded this visit, by monthId(), least recently loaded first */
  months: Record<string, MonthEntry>;
  /** The month the table shows */
  viewYear: number;
  viewMonth: number;
  /**
   * Load a month of a city (the current one by default) into `months`. Each load only
   * writes its own month, so a slow answer can never land under another city or month.
   * A foreground load shows its progress; a background load (the countdown retrying on
   * its own) leaves the month as it is until it succeeds.
   */
  loadMonth: (year: number, month: number, options?: { cityId?: string; background?: boolean }) => Promise<MonthLoad>;
  /** Show a month in the table, and (re)load it */
  showMonth: (year: number, month: number) => Promise<void>;
  /** The countdown's data: the city's current month, and the next one on a month's last day */
  loadCountdownMonths: (options?: { background?: boolean }) => Promise<void>;
}

/** At most this many months stay in memory; the ones on screen are always kept */
const MAX_MONTHS = 12;

export const monthId = (cityId: string, year: number, month: number) => `${cityId}:${monthKey(year, month)}`;

/** The months nothing may evict: the table's, and the countdown's current and next month */
function pinnedMonths(state: AppState): Set<string> {
  const { cityId } = state.location;
  const pinned = new Set([monthId(cityId, state.viewYear, state.viewMonth)]);
  if (state.todayDateStr) {
    const year = Number(state.todayDateStr.slice(0, 4));
    const month = Number(state.todayDateStr.slice(5, 7));
    const next = shiftMonth(year, month, 1);
    pinned.add(monthId(cityId, year, month)).add(monthId(cityId, next.year, next.month));
  }
  return pinned;
}

/** `months` with `entry` as its most recent month, trimmed to MAX_MONTHS */
function withMonth(state: AppState, id: string, entry: MonthEntry): Record<string, MonthEntry> {
  const months: Record<string, MonthEntry> = {};
  for (const [key, value] of Object.entries(state.months)) if (key !== id) months[key] = value;
  months[id] = entry;
  const keys = Object.keys(months);
  if (keys.length > MAX_MONTHS) {
    const pinned = pinnedMonths(state);
    pinned.add(id);
    let excess = keys.length - MAX_MONTHS;
    for (const key of keys) {
      if (excess === 0) break;
      if (pinned.has(key)) continue;
      delete months[key];
      excess--;
    }
  }
  return months;
}

export const createScheduleSlice: StateCreator<AppState, [], [], ScheduleSlice> = (set, get) => ({
  months: {},
  // Set from the build date by useStore.ts, then from the city's today on hydration
  viewYear: 0,
  viewMonth: 0,

  loadMonth: async (year, month, { cityId = get().location.cityId, background = false } = {}) => {
    const id = monthId(cityId, year, month);
    if (!background) {
      set((s) => ({ months: withMonth(s, id, { days: s.months[id]?.days ?? [], status: "loading", error: null }) }));
    }
    try {
      const res = await getSchedule(cityId, year, month);
      if (res.status && res.data) {
        const data = res.data;
        set((s) => ({ months: withMonth(s, id, { days: data.jadwal, status: "ready", error: null }) }));
        return { ok: true, data };
      }
      if (!background) {
        set((s) => ({ months: withMonth(s, id, { days: s.months[id]?.days ?? [], status: "error", error: MESSAGES.noSchedule }) }));
      }
      return { ok: false, error: MESSAGES.noSchedule };
    } catch {
      const error = loadFailedMessage();
      if (!background) {
        set((s) => ({ months: withMonth(s, id, { days: s.months[id]?.days ?? [], status: "error", error }) }));
      }
      return { ok: false, error };
    }
  },

  showMonth: async (year, month) => {
    set({ viewYear: year, viewMonth: month });
    await get().loadMonth(year, month);
  },

  loadCountdownMonths: async ({ background = false } = {}) => {
    const { location, timeOffset, loadMonth } = get();
    const today = cityDate(Date.now() + timeOffset, location.timezone);
    const loads: Promise<MonthLoad>[] = [loadMonth(today.year, today.month, { background })];
    // After Isya on a month's last day, the countdown targets tomorrow's Imsak
    if (today.day === daysInMonth(today.year, today.month)) {
      const next = shiftMonth(today.year, today.month, 1);
      loads.push(loadMonth(next.year, next.month, { background }));
    }
    await Promise.all(loads);
  },
});
