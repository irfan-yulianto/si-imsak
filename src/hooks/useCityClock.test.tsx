import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useCityMinute, useCityToday } from "./useCityClock";
import { useStore } from "@/store/useStore";
import { BUILD_DATE } from "@/lib/city-time";
import { DENPASAR, JAKARTA, resetStore } from "@/__tests__/store";

beforeEach(() => {
  resetStore();
  // 31 October 2026, 23:59:00 WIB
  vi.useFakeTimers({ now: new Date("2026-10-31T16:59:00Z") });
});

afterEach(() => {
  vi.useRealTimers();
});

function Probe() {
  return <span>{`${useCityToday()} ${useCityMinute()}`}</span>;
}

describe("useCityToday and useCityMinute", () => {
  it("give the date and the minute of the day in the selected city", () => {
    const today = renderHook(() => useCityToday());
    const minute = renderHook(() => useCityMinute());
    expect(today.result.current).toBe("2026-10-31");
    expect(minute.result.current).toBe(23 * 60 + 59);

    // Denpasar is an hour ahead: already 1 November, 00:59
    act(() => useStore.setState({ location: DENPASAR }));
    expect(today.result.current).toBe("2026-11-01");
    expect(minute.result.current).toBe(59);
  });

  it("change on the next minute, without anything else happening", () => {
    useStore.setState({ location: JAKARTA });
    const today = renderHook(() => useCityToday());
    const minute = renderHook(() => useCityMinute());

    // The minute, and the clock's slack after it
    act(() => {
      vi.advanceTimersByTime(60_100);
    });
    expect(today.result.current).toBe("2026-11-01");
    expect(minute.result.current).toBe(0);
  });

  it("follow the server clock", () => {
    const today = renderHook(() => useCityToday());
    act(() => useStore.getState().setTimeOffset(90_000));
    expect(today.result.current).toBe("2026-11-01");
  });

  it("catch up at once when the page is shown again", () => {
    const minute = renderHook(() => useCityMinute());
    // Suspended in the background: the clock moved, no timer ran
    vi.setSystemTime(new Date("2026-10-31T19:30:00Z"));
    expect(minute.result.current).toBe(23 * 60 + 59);
    act(() => {
      window.dispatchEvent(new Event("pageshow"));
    });
    expect(minute.result.current).toBe(2 * 60 + 30);
  });

  it("render the build date and no time on the server, so hydration always matches", () => {
    expect(renderToString(<Probe />)).toContain(`${BUILD_DATE.iso} null`);
  });
});
