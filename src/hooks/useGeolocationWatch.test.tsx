import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGeolocationWatch } from "./useGeolocationWatch";

type Success = (pos: GeolocationPosition) => void;
type Failure = (err: GeolocationPositionError) => void;

let onPosition: Success = () => {};
let onError: Failure = () => {};
const geolocation = {
  watchPosition: vi.fn((success: Success, failure: Failure) => {
    onPosition = success;
    onError = failure;
    return 7;
  }),
  clearWatch: vi.fn(),
};

const fix = (accuracy: number) =>
  ({ coords: { latitude: -6.2, longitude: 106.8, accuracy } }) as GeolocationPosition;
const failure = (code: number) =>
  ({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }) as GeolocationPositionError;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("navigator", { ...navigator, geolocation });
  geolocation.watchPosition.mockClear();
  geolocation.clearWatch.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useGeolocationWatch", () => {
  it("reports each fix, and stops once one is accurate to 100 m", () => {
    const onFix = vi.fn();
    const { result } = renderHook(() => useGeolocationWatch(onFix));
    act(() => result.current.start());
    expect(result.current.watching).toBe(true);

    act(() => onPosition(fix(800)));
    expect(onFix).toHaveBeenLastCalledWith({ lat: -6.2, lng: 106.8 }, 800);
    expect(result.current.watching).toBe(true);

    act(() => onPosition(fix(40)));
    expect(onFix).toHaveBeenLastCalledWith({ lat: -6.2, lng: 106.8 }, 40);
    expect(result.current.watching).toBe(false);
    expect(geolocation.clearWatch).toHaveBeenCalledWith(7);

    // A late fix from the ended watch is ignored
    act(() => onPosition(fix(10)));
    expect(onFix).toHaveBeenCalledTimes(2);
  });

  it("stops after 15 s with the best fix so far", () => {
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    act(() => onPosition(fix(500)));
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(result.current.watching).toBe(false);
  });

  it("explains why the position couldn't be read", () => {
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    act(() => onError(failure(1)));
    expect(result.current.watching).toBe(false);
    expect(result.current.error).toBe("Izin lokasi ditolak. Buka pengaturan browser atau gunakan pencarian kota di bawah.");

    act(() => result.current.start());
    expect(result.current.error).toBeNull();
    act(() => onError(failure(2)));
    expect(result.current.error).toBe("Lokasi tidak tersedia. Pastikan GPS aktif.");
  });

  it("stops watching when the finder closes", () => {
    const { result, unmount } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    unmount();
    expect(geolocation.clearWatch).toHaveBeenCalledWith(7);
    expect(vi.getTimerCount()).toBe(0);
  });
});
