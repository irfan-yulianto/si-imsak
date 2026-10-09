import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppBootstrap } from "./useAppBootstrap";
import { useStore } from "@/store/useStore";
import { getSchedule } from "@/lib/api";
import { syncServerTime } from "@/lib/time";
import { DENPASAR, JAKARTA, asCity, day, monthOf, resetStore, scheduleResponse } from "@/__tests__/store";

vi.mock("@/lib/api", () => ({ getSchedule: vi.fn(), reverseGeocodeCity: vi.fn(), searchCities: vi.fn() }));
vi.mock("@/lib/time", () => ({ syncServerTime: vi.fn() }));

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  resetStore();
  localStorage.clear();
  // 31 October 2026, 23:00 WITA
  vi.useFakeTimers({ now: new Date("2026-10-31T15:00:00Z") });
  vi.mocked(getSchedule).mockReset().mockImplementation(async (_id, year, month) =>
    scheduleResponse(DENPASAR, [day(`${year}-${String(month).padStart(2, "0")}-01`)])
  );
  vi.mocked(syncServerTime).mockReset().mockResolvedValue(250);
});

afterEach(() => {
  vi.useRealTimers();
  setVisibility("visible");
});

describe("useAppBootstrap", () => {
  it("restores the saved city before the first paint, then loads its current month", async () => {
    localStorage.setItem("selectedLocation", JSON.stringify(asCity(DENPASAR)));
    // A cache written by an earlier version: moved over and used at once
    localStorage.setItem(
      `schedule_${DENPASAR.cityId}_2026_10`,
      JSON.stringify({ _ts: Date.now(), status: true, data: { ...asCity(DENPASAR), id: DENPASAR.cityId, jadwal: [day("2026-10-31")] } })
    );

    renderHook(() => useAppBootstrap());

    expect(useStore.getState().location).toEqual(DENPASAR);
    expect(getSchedule).toHaveBeenCalledWith(DENPASAR.cityId, 2026, 10);
    expect(localStorage.getItem(`schedule_${DENPASAR.cityId}_2026_10`)).toBeNull();
    await act(async () => {});
    expect(monthOf(2026, 10)?.status).toBe("ready");
  });

  it("loads the default city on a first visit", () => {
    renderHook(() => useAppBootstrap());
    expect(useStore.getState().location).toEqual(JAKARTA);
    expect(getSchedule).toHaveBeenCalledWith(JAKARTA.cityId, 2026, 10);
  });

  it("follows the connection", () => {
    renderHook(() => useAppBootstrap());
    expect(useStore.getState().isOffline).toBe(false);

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(useStore.getState().isOffline).toBe(true);

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(useStore.getState().isOffline).toBe(false);
  });

  it("syncs with the server clock now and when the app returns to the foreground", async () => {
    renderHook(() => useAppBootstrap());
    await act(async () => {});
    expect(syncServerTime).toHaveBeenCalledTimes(1);
    expect(useStore.getState().timeOffset).toBe(250);

    vi.mocked(syncServerTime).mockResolvedValue(900);
    await act(async () => {
      setVisibility("hidden");
      setVisibility("visible");
    });
    expect(syncServerTime).toHaveBeenCalledTimes(2);
    expect(useStore.getState().timeOffset).toBe(900);
  });

  it("loads the city again once its month changes, but not before", async () => {
    localStorage.setItem("selectedLocation", JSON.stringify(asCity(DENPASAR)));
    renderHook(() => useAppBootstrap());
    expect(getSchedule).toHaveBeenCalledTimes(1);

    // Still October in Denpasar after half an hour
    await act(async () => {
      vi.advanceTimersByTime(30 * 60_000);
      setVisibility("visible");
    });
    expect(getSchedule).toHaveBeenCalledTimes(1);

    // An hour later it is November there (00:30 WITA): the hourly check notices
    await act(async () => {
      vi.advanceTimersByTime(30 * 60_000);
    });
    expect(getSchedule).toHaveBeenCalledTimes(2);
    expect(getSchedule).toHaveBeenLastCalledWith(DENPASAR.cityId, 2026, 11);
    expect(useStore.getState()).toMatchObject({ viewMonth: 11 });
  });

  it("checks the month as soon as a locked phone is used again", async () => {
    renderHook(() => useAppBootstrap());
    await act(async () => {
      setVisibility("hidden");
      // Asleep across midnight WIB into November: no timer ran in between
      vi.setSystemTime(new Date("2026-10-31T17:30:00Z"));
      setVisibility("visible");
    });
    expect(getSchedule).toHaveBeenLastCalledWith(JAKARTA.cityId, 2026, 11);
  });
});
