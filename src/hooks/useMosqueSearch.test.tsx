import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMosqueSearch, type SearchArea } from "./useMosqueSearch";
import { resetStore } from "@/__tests__/store";
import { FakeStorage } from "@/__tests__/fake-storage";

const MONAS = { lat: -6.1754, lng: 106.8272 };
const area = (overrides: Partial<SearchArea> = {}): SearchArea => ({ coords: MONAS, radius: 2000, accuracy: 30, gps: true, ...overrides });
const mosque = { id: "node/1", name: "Masjid Istiqlal", lat: -6.1702, lng: 106.8314, distance: 0, type: "masjid" };
const ok = (data: object[]) => new Response(JSON.stringify({ status: true, data }), { status: 200 });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  resetStore();
  vi.stubGlobal("localStorage", new FakeStorage());
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useMosqueSearch", () => {
  it("cancels the search before it when a new one starts", async () => {
    const signals: AbortSignal[] = [];
    fetchMock.mockImplementation((_url, init) => {
      signals.push(init!.signal!);
      return signals.length === 1 ? new Promise(() => {}) : Promise.resolve(ok([mosque]));
    });
    const { result } = renderHook(() => useMosqueSearch());

    act(() => result.current.refresh(area()));
    act(() => result.current.refresh(area({ radius: 4000 })));
    expect(signals[0].aborted).toBe(true);
    await waitFor(() => expect(result.current.mosques).toHaveLength(1));
    expect(result.current.loading).toBe(false);
  });

  it("cancels a running search when the finder closes", () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url, init) => {
      signal = init!.signal!;
      return new Promise(() => {});
    });
    const { result, unmount } = renderHook(() => useMosqueSearch());
    act(() => result.current.refresh(area()));
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("follows the place without searching again for a few meters, but does for a sharper fix or the GPS", async () => {
    fetchMock.mockImplementation(async () => ok([mosque]));
    const { result } = renderHook(() => useMosqueSearch());

    act(() => result.current.follow(area({ gps: false, accuracy: null })));
    await waitFor(() => expect(result.current.mosques).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // From the city's centre to the GPS position: past the cache
    act(() => result.current.follow(area({ accuracy: 400 })));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    // 50 m further, no sharper: the answer still holds
    act(() => result.current.follow(area({ coords: { lat: MONAS.lat + 0.00045, lng: MONAS.lng }, accuracy: 400 })));
    // Twice as accurate: from the cache, which now has this place
    act(() => result.current.follow(area({ accuracy: 150 })));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.mosques[0].name).toBe("Masjid Istiqlal");
  });

  it("retries a failing server twice, then says it is busy", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => new Response("", { status: 502 }));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.refresh(area()));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.error).toBe("Layanan pencarian masjid sedang sibuk. Coba lagi beberapa saat.");
    expect(result.current.loading).toBe(false);
  });
});
