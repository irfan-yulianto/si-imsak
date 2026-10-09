import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useCountdownTicker } from "./useCountdownTicker";
import { useStore } from "@/store/useStore";
import { resetStore } from "@/__tests__/store";

const NOW = Date.UTC(2026, 9, 9, 5, 0, 0);

function Digits({ targetMs, onDue }: { targetMs: number; onDue: () => void }) {
  const { hoursRef, minutesRef, secondsRef } = useCountdownTicker(targetMs, onDue);
  return (
    <p>
      <span ref={hoursRef}>--</span>:<span ref={minutesRef}>--</span>:<span ref={secondsRef}>--</span>
    </p>
  );
}

const pass = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  resetStore();
  vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountdownTicker", () => {
  it("shows the time left as soon as it mounts", () => {
    const { container } = render(<Digits targetMs={NOW + 3_723_500} onDue={() => {}} />);
    expect(container).toHaveTextContent("01:02:03");
  });

  it("changes the digits on each whole second, and calls onDue right as the target arrives", () => {
    const onDue = vi.fn();
    const { container } = render(<Digits targetMs={NOW + 2_500} onDue={onDue} />);
    expect(container).toHaveTextContent("00:00:02");

    pass(499); // 2.001 s left
    expect(container).toHaveTextContent("00:00:02");
    pass(1); // 2 s
    expect(container).toHaveTextContent("00:00:01");
    pass(1_000); // 1 s: the last second shows 00
    expect(container).toHaveTextContent("00:00:00");
    pass(999);
    expect(onDue).not.toHaveBeenCalled();

    pass(1); // the target
    expect(onDue).toHaveBeenCalledTimes(1);
    // Until a new target replaces this one, it asks again every second
    pass(1_000);
    expect(onDue).toHaveBeenCalledTimes(2);
  });

  it("ticks once a second on a clock that stands still at a whole second (a test's fixed time)", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const timeouts = vi.spyOn(globalThis, "setTimeout");
    render(<Digits targetMs={NOW + 60_000} onDue={() => {}} />);
    pass(3_000);
    const delays = timeouts.mock.calls.filter(([fn]) => typeof fn === "function" && fn.name === "tick").map(([, ms]) => ms);
    expect(delays).toEqual([1000, 1000, 1000, 1000]);
  });

  it("keeps ticks 20 ms apart even when the clock stands still just past a whole second", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const timeouts = vi.spyOn(globalThis, "setTimeout");
    render(<Digits targetMs={NOW + 60_001} onDue={() => {}} />);
    pass(1_000);
    const delays = timeouts.mock.calls.filter(([fn]) => typeof fn === "function" && fn.name === "tick").map(([, ms]) => ms);
    expect(delays.length).toBe(51);
    expect(Math.min(...(delays as number[]))).toBe(20);
  });

  it("calls onDue as soon as timers run again after the phone slept past the target", () => {
    const onDue = vi.fn();
    render(<Digits targetMs={NOW + 10_000} onDue={onDue} />);
    vi.setSystemTime(NOW + 2 * 3_600_000);
    pass(1_000);
    expect(onDue).toHaveBeenCalledTimes(1);
  });

  it("follows the server clock", () => {
    const { container } = render(<Digits targetMs={NOW + 60_500} onDue={() => {}} />);
    expect(container).toHaveTextContent("00:01:00");
    act(() => useStore.getState().setTimeOffset(30_000));
    expect(container).toHaveTextContent("00:00:30");
  });

  it("stops its timer on unmount", () => {
    const { unmount } = render(<Digits targetMs={NOW + 60_000} onDue={() => {}} />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
