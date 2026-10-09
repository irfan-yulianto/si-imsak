import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNextPrayer } from "./useNextPrayer";
import { JAKARTA, day, resetStore, seedCity, seedMonth } from "@/__tests__/store";

vi.mock("@/lib/api", () => ({ getSchedule: vi.fn(() => new Promise(() => {})) }));

beforeEach(() => {
  resetStore();
  // 15 March 2026, 12:04:58 WIB: Dzuhur (12:05) in 2 s
  vi.useFakeTimers({ now: new Date("2026-03-15T05:04:58Z") });
  seedCity(JAKARTA, "2026-03-15");
  seedMonth(2026, 3, [day("2026-03-15"), day("2026-03-16")]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useNextPrayer", () => {
  it("announces a time once as it arrives, for 30 s, and moves on to the next", () => {
    const { result } = renderHook(() => useNextPrayer());
    expect(result.current.nextPrayer).toMatchObject({ key: "dzuhur", time: "12:05" });
    expect(result.current.arrival).toBeNull();

    act(() => {
      vi.advanceTimersByTime(2_000);
      result.current.recheck();
    });
    expect(result.current.arrival).toEqual({ key: "dzuhur", name: "Dzuhur" });
    expect(result.current.nextPrayer).toMatchObject({ key: "ashar", time: "15:15" });

    act(() => {
      vi.advanceTimersByTime(29_000);
      result.current.recheck();
    });
    expect(result.current.arrival).toEqual({ key: "dzuhur", name: "Dzuhur" });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.arrival).toBeNull();
  });

  it("keeps the same target object between checks, and replaces it a day later", () => {
    const { result } = renderHook(() => useNextPrayer());
    const first = result.current.nextPrayer;
    act(() => {
      vi.advanceTimersByTime(1_000);
      result.current.recheck();
    });
    expect(result.current.nextPrayer).toBe(first);

    // Asleep for a day: the same time of day, but tomorrow — and the missed one isn't announced
    act(() => {
      vi.setSystemTime(new Date("2026-03-16T05:04:58Z"));
      result.current.recheck();
    });
    expect(result.current.nextPrayer).toMatchObject({ key: "dzuhur", time: "12:05" });
    expect(result.current.nextPrayer?.targetMs).toBe(first!.targetMs + 86_400_000);
    expect(result.current.arrival).toBeNull();
  });
});
