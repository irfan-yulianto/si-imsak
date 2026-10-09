import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setClockOffset, subscribeToClock } from "./clock";

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-09T03:00:20Z") });
  setClockOffset(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("subscribeToClock", () => {
  it("calls its listeners just after every minute boundary, with one timer for all", () => {
    const a = vi.fn();
    const b = vi.fn();
    const stopA = subscribeToClock(a);
    const stopB = subscribeToClock(b);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(40_000); // 03:01:00, the slack not yet over
    expect(a).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_000);
    expect(a).toHaveBeenCalledTimes(2);

    stopA();
    vi.advanceTimersByTime(60_000);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(3);

    stopB();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("aligns to the server-corrected minute", () => {
    const listener = vi.fn();
    const stop = subscribeToClock(listener);
    // The server is 30 s ahead: its minute ends 10 s from now
    setClockOffset(30_000);
    vi.advanceTimersByTime(10_100);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });

  it("calls at once when the page is visible again, restored, or back online", () => {
    const listener = vi.fn();
    const stop = subscribeToClock(listener);

    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(listener).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pageshow"));
    window.dispatchEvent(new Event("online"));
    expect(listener).toHaveBeenCalledTimes(3);

    stop();
    window.dispatchEvent(new Event("online"));
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
