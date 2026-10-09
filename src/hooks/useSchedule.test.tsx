import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCountdownDays, useCurrentMonth, useViewSchedule } from "./useSchedule";
import { useStore } from "@/store/useStore";
import { BANDUNG, JAKARTA, day, resetStore, seedCity, seedMonth } from "@/__tests__/store";

beforeEach(() => {
  resetStore();
  // 31 October 2026, 12:00 WIB
  vi.useFakeTimers({ now: new Date("2026-10-31T05:00:00Z") });
  seedCity(JAKARTA, "2026-10-31");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("schedule hooks", () => {
  it("give the table its month, and the countdown this month plus next month once loaded", () => {
    seedMonth(2026, 10, [day("2026-10-31")]);
    const table = renderHook(() => useViewSchedule());
    const countdown = renderHook(() => useCountdownDays());
    const current = renderHook(() => useCurrentMonth());

    expect(table.result.current).toEqual({ data: [day("2026-10-31")], loading: false, error: null });
    expect(countdown.result.current).toEqual([day("2026-10-31")]);
    expect(current.result.current?.status).toBe("ready");

    act(() => seedMonth(2026, 11, [day("2026-11-01")]));
    expect(countdown.result.current).toEqual([day("2026-10-31"), day("2026-11-01")]);
    // Re-rendering without a change keeps the same array
    const before = countdown.result.current;
    countdown.rerender();
    expect(countdown.result.current).toBe(before);
  });

  it("show a month that hasn't loaded yet as loading, and a failed one with its error", () => {
    const table = renderHook(() => useViewSchedule());
    expect(table.result.current).toEqual({ data: [], loading: true, error: null });
    act(() => seedMonth(2026, 10, [], { status: "error", error: "Gagal memuat jadwal. Coba lagi nanti." }));
    expect(table.result.current).toEqual({ data: [], loading: false, error: "Gagal memuat jadwal. Coba lagi nanti." });
  });

  it("follow the selected city", () => {
    seedMonth(2026, 10, [day("2026-10-31")], { cityId: BANDUNG.cityId });
    const countdown = renderHook(() => useCountdownDays());
    expect(countdown.result.current).toEqual([]);
    act(() => useStore.setState({ location: BANDUNG }));
    expect(countdown.result.current).toEqual([day("2026-10-31")]);
  });

  it("move the countdown to the new month at the city's midnight", () => {
    vi.setSystemTime(new Date("2026-10-31T16:59:30Z")); // 23:59:30 WIB
    seedMonth(2026, 10, [day("2026-10-31")]);
    seedMonth(2026, 11, [day("2026-11-01")]);
    const current = renderHook(() => useCurrentMonth());
    expect(current.result.current?.days).toEqual([day("2026-10-31")]);

    act(() => {
      vi.advanceTimersByTime(30_100);
    });
    expect(current.result.current?.days).toEqual([day("2026-11-01")]);
  });
});
