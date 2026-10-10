import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGeolocationWatch } from "./useGeolocationWatch";
import type { GeoFix } from "@/types";

type Success = (pos: GeolocationPosition) => void;
type Failure = (err: GeolocationPositionError) => void;

let onPosition: Success = () => {};
let onError: Failure = () => {};
const geolocation = {
  watchPosition: vi.fn<(success: Success, failure: Failure, options?: PositionOptions) => number>((success, failure) => {
    onPosition = success;
    onError = failure;
    return 7;
  }),
  clearWatch: vi.fn(),
};

/** A reading `north` meters north of a point in Jakarta */
const fix = (accuracy: number, north = 0) =>
  ({ coords: { latitude: -6.2 + north / 111_200, longitude: 106.8, accuracy }, timestamp: 1_000 }) as GeolocationPosition;
/** A fix already in hand, `north` meters north of the same point */
const inHand = (accuracy: number, north = 0): GeoFix => ({ lat: -6.2 + north / 111_200, lng: 106.8, accuracy, at: 500 });
const failure = (code: number) =>
  ({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }) as GeolocationPositionError;

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("navigator", { ...navigator, geolocation });
  geolocation.watchPosition.mockClear();
  geolocation.clearWatch.mockClear();
});

afterEach(() => {
  setVisibility("visible");
  vi.useRealTimers();
});

describe("useGeolocationWatch", () => {
  it("passes on the first fix at once, then only sharper ones, and stops at 50 m", () => {
    const onFix = vi.fn();
    const { result } = renderHook(() => useGeolocationWatch(onFix));
    act(() => result.current.start());
    expect(result.current.status).toBe("locating");
    // A recent reading the device already has is good enough to start with
    expect(geolocation.watchPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true, maximumAge: 30_000 });

    act(() => onPosition(fix(800)));
    expect(onFix).toHaveBeenLastCalledWith({ lat: -6.2, lng: 106.8, accuracy: 800, at: 1_000 });
    expect(result.current.status).toBe("refining");

    // Rougher, at the same spot: ignored
    act(() => onPosition(fix(900, 100)));
    expect(onFix).toHaveBeenCalledTimes(1);

    act(() => onPosition(fix(120)));
    act(() => onPosition(fix(40)));
    expect(onFix).toHaveBeenCalledTimes(3);
    expect(onFix).toHaveBeenLastCalledWith(expect.objectContaining({ accuracy: 40 }));
    expect(result.current.status).toBe("idle");
    expect(result.current.settled).toBe(false);
    expect(geolocation.clearWatch).toHaveBeenCalledWith(7);

    // A late fix from the ended watch is ignored
    act(() => onPosition(fix(10)));
    expect(onFix).toHaveBeenCalledTimes(3);
  });

  it("takes a rougher fix when the user has clearly moved", () => {
    const onFix = vi.fn();
    const { result } = renderHook(() => useGeolocationWatch(onFix));
    act(() => result.current.start());
    act(() => onPosition(fix(80)));
    // 1 km away is more than both accuracies together: a new place, not a worse reading
    act(() => onPosition(fix(100, 1000)));
    expect(onFix).toHaveBeenCalledTimes(2);
  });

  it("keeps sharpening for a minute after the first reading, then settles without a message", () => {
    const onFix = vi.fn();
    const { result } = renderHook(() => useGeolocationWatch(onFix));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    act(() => onPosition(fix(500)));
    expect(result.current.settled).toBe(false);

    // A better reading late in the minute doesn't extend it
    act(() => {
      vi.advanceTimersByTime(50_000);
    });
    act(() => onPosition(fix(120)));
    expect(onFix).toHaveBeenCalledTimes(2);
    act(() => {
      vi.advanceTimersByTime(9_999);
    });
    expect(result.current.status).toBe("refining");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.settled).toBe(true);
    expect(result.current.error).toBeNull();
    expect(geolocation.clearWatch).toHaveBeenCalledWith(7);
  });

  it("starts from the fix in hand, and passes on only a reading that betters it", () => {
    const onFix = vi.fn();
    const { result } = renderHook(() => useGeolocationWatch(onFix));
    act(() => result.current.start({ seed: inHand(80) }));
    expect(result.current.status).toBe("refining");

    // As rough as the fix in hand, at the same spot: nothing new
    act(() => onPosition(fix(100, 50)));
    expect(onFix).not.toHaveBeenCalled();
    expect(result.current.status).toBe("refining");

    act(() => onPosition(fix(10)));
    expect(onFix).toHaveBeenCalledTimes(1);
    expect(onFix).toHaveBeenLastCalledWith(expect.objectContaining({ accuracy: 10 }));
    expect(result.current.status).toBe("idle");
    expect(result.current.settled).toBe(false);
  });

  it("stops at a sharp reading even when the fix in hand is sharper", () => {
    const onFix = vi.fn();
    const { result } = renderHook(() => useGeolocationWatch(onFix));
    act(() => result.current.start({ seed: inHand(20) }));
    act(() => onPosition(fix(30)));
    expect(onFix).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
    expect(geolocation.clearWatch).toHaveBeenCalledWith(7);
  });

  it("asks for a new reading, not one the device has from before, when told to", () => {
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start({ fresh: true }));
    expect(geolocation.watchPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true, maximumAge: 0 });
  });

  it("says when a watch from a fix in hand gets no reading in time", () => {
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start({ seed: inHand(80) }));
    act(() => onError(failure(3)));
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBe("Lokasi belum ditemukan. Pastikan GPS aktif, lalu coba lagi di tempat terbuka.");
  });

  it("is settled only when the minute runs out: not when cancelled, failed or hidden", () => {
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    act(() => onPosition(fix(500)));
    act(() => result.current.stop());
    expect(result.current.settled).toBe(false);

    act(() => result.current.start());
    act(() => onError(failure(2)));
    expect(result.current.settled).toBe(false);

    act(() => result.current.start());
    act(() => onPosition(fix(500)));
    act(() => setVisibility("hidden"));
    expect(result.current.settled).toBe(false);

    act(() => setVisibility("visible"));
    act(() => result.current.start());
    act(() => onPosition(fix(500)));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.settled).toBe(true);
    // A new watch starts over
    act(() => result.current.start());
    expect(result.current.settled).toBe(false);
  });

  it("explains why there is no position: refused, unavailable, or not found in time", () => {
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    act(() => onError(failure(1)));
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBe("Izin lokasi ditolak. Buka pengaturan browser atau gunakan pencarian kota di bawah.");

    act(() => result.current.start());
    expect(result.current.error).toBeNull();
    act(() => onError(failure(2)));
    expect(result.current.error).toBe("Lokasi tidak tersedia. Pastikan GPS aktif.");

    act(() => result.current.start());
    act(() => onError(failure(3)));
    expect(result.current.error).toBe("Lokasi belum ditemukan. Pastikan GPS aktif, lalu coba lagi di tempat terbuka.");
    // The device gets 20 s for a first reading (the permission prompt not counted)
    expect(geolocation.watchPosition.mock.calls[2][2]).toMatchObject({ timeout: 20_000 });
  });

  it("keeps the fix it has when a later reading fails", () => {
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    act(() => onPosition(fix(300)));
    act(() => onError(failure(3)));
    expect(result.current.status).toBe("refining");
    expect(result.current.error).toBeNull();
  });

  it("gives up after a minute without any answer, e.g. a prompt left unanswered", () => {
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.settled).toBe(false);
    expect(result.current.error).toBe("Lokasi belum ditemukan. Pastikan GPS aktif, lalu coba lagi di tempat terbuka.");
  });

  it("fails without a message when started quietly", () => {
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start({ quiet: true }));
    act(() => onError(failure(1)));
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("says so, as the city detection does, on a device without location", () => {
    vi.stubGlobal("navigator", { ...navigator, geolocation: undefined });
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBe("Perangkat ini tidak mendukung deteksi lokasi.");
  });

  it("stops when the page is hidden, and when the finder closes", () => {
    const { result, unmount } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    act(() => setVisibility("hidden"));
    expect(result.current.status).toBe("idle");
    expect(geolocation.clearWatch).toHaveBeenCalledWith(7);

    act(() => setVisibility("visible"));
    act(() => result.current.start());
    unmount();
    expect(geolocation.clearWatch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
