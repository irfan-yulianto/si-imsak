import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMosqueSearch, type SearchArea } from "./useMosqueSearch";
import { resetStore } from "@/__tests__/store";
import { useStore } from "@/store/useStore";

const MONAS = { lat: -6.1754, lng: 106.8272 };
/** Monas rounded to ~1 km: where the server searches from */
const MONAS_CENTER = { lat: -6.18, lng: 106.83 };
/** `meters` south of Monas */
const south = (meters: number) => ({ lat: MONAS.lat - meters / 111_200, lng: MONAS.lng });
const area = (overrides: Partial<SearchArea> = {}): SearchArea => ({ coords: MONAS, basis: "gps", ...overrides });
const mosque = { id: "n1", name: "Masjid Istiqlal", lat: -6.1702, lng: 106.8314, distance: 1120, type: "masjid" };
/** `count` mosques due north of Monas, `every` meters apart */
const northOfMonas = (count: number, every = 11.12) =>
  Array.from({ length: count }, (_, i) => ({
    id: `n${i}`,
    name: `Masjid ${i}`,
    lat: MONAS.lat + ((i + 1) * every) / 111_200,
    lng: MONAS.lng,
    distance: (i + 1) * every,
    type: "masjid",
  }));
const ok = (data: object[], coverage?: number, center = MONAS_CENTER) =>
  new Response(
    JSON.stringify({ status: true, data, ...(coverage !== undefined && { meta: { center, coverage, dataDate: "2026-10-06" } }) }),
    { status: 200 }
  );

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  resetStore();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useMosqueSearch", () => {
  it("sends the position rounded to ~1 km, and keeps where and how far the server searched", async () => {
    fetchMock.mockImplementation(async () => ok([mosque], 1800));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    await waitFor(() => expect(result.current.answer).not.toBeNull());

    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://x");
    expect(url.pathname).toBe("/api/mosques");
    expect(Object.fromEntries(url.searchParams)).toEqual({ lat: "-6.18", lng: "106.83" });
    expect(result.current.answer).toMatchObject({
      basis: "gps",
      center: MONAS_CENTER,
      coverage: 1800,
      mosques: [expect.objectContaining({ name: "Masjid Istiqlal" })],
    });
  });

  it("passes on whether the server takes suggestions", async () => {
    fetchMock.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ status: true, data: [mosque], meta: { center: MONAS_CENTER, coverage: 1800, dataDate: "2026-10-06", suggestions: true } }),
          { status: 200 }
        )
    );
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    await waitFor(() => expect(result.current.answer).not.toBeNull());
    expect(result.current.answer?.suggestions).toBe(true);
  });

  it("trusts an answer without its coverage only as far as its farthest mosque", async () => {
    fetchMock.mockImplementation(async () => ok([mosque]));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    await waitFor(() => expect(result.current.answer?.coverage).toBe(1120));
    expect(result.current.answer?.center).toEqual(MONAS_CENTER);
  });

  it("cancels the search before it when a new one starts", async () => {
    const signals: AbortSignal[] = [];
    fetchMock.mockImplementation((_url, init) => {
      signals.push(init!.signal!);
      return signals.length === 1 ? new Promise(() => {}) : Promise.resolve(ok([mosque], 1800));
    });
    const { result } = renderHook(() => useMosqueSearch());

    act(() => result.current.refresh(area()));
    act(() => result.current.refresh(area({ basis: "kota:KOTA BOGOR" })));
    expect(signals[0].aborted).toBe(true);
    await waitFor(() => expect(result.current.answer?.basis).toBe("kota:KOTA BOGOR"));
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

  it("doesn't search again while the answer still tells the nearest mosques", async () => {
    fetchMock.mockImplementation(async () => ok([mosque], 1800));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    await waitFor(() => expect(result.current.answer).not.toBeNull());

    act(() => result.current.follow(area({ coords: south(50) })));
    act(() => result.current.follow(area({ coords: south(400) })));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("searches again from the new point once the position leaves what the answer covers", async () => {
    fetchMock.mockImplementation(async () => ok(northOfMonas(50), 1200));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    await waitFor(() => expect(result.current.answer).not.toBeNull());

    // 1.5 km south: ~1 km from where it searched, so only 165 m of it is sure there
    act(() => result.current.follow(area({ coords: south(1500) })));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(new URL(String(fetchMock.mock.calls[1][0]), "http://x").searchParams.get("lat")).toBe("-6.19");
  });

  it("never asks again from the same rounded point: the answer would be the same", async () => {
    fetchMock.mockImplementation(async () => ok(northOfMonas(50, 2), 100));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    await waitFor(() => expect(result.current.answer).not.toBeNull());
    // Little of it is sure 300 m south, but the server would search from the same point
    act(() => result.current.follow(area({ coords: south(300) })));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("awaits a search on its way for a nearby position instead of restarting it", async () => {
    let answerFirst!: (res: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)));
    const { result } = renderHook(() => useMosqueSearch());

    act(() => result.current.follow(area()));
    // Fixes keep coming while the answer is on its way
    act(() => result.current.follow(area({ coords: south(100) })));
    act(() => result.current.follow(area({ coords: south(150) })));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => answerFirst(ok([mosque], 1800)));
    await waitFor(() => expect(result.current.answer).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("starts again for another basis, even at the same spot", async () => {
    fetchMock.mockImplementation(async () => ok([mosque], 1800));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area({ basis: "pusat:KOTA JAKARTA" })));
    await waitFor(() => expect(result.current.answer?.basis).toBe("pusat:KOTA JAKARTA"));
    act(() => result.current.follow(area({ basis: "gps" })));
    await waitFor(() => expect(result.current.answer?.basis).toBe("gps"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("says when nothing is recorded within the distance searched", async () => {
    fetchMock.mockImplementation(async () => ok([], 25_000));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    await waitFor(() => expect(result.current.answer?.mosques).toEqual([]));
    expect(result.current.error).toBe(
      "Tidak ada masjid atau musholla yang tercatat dalam 25 km. Coba cari di Google Maps, atau laporkan yang Anda tahu di OpenStreetMap."
    );
  });

  it("retries a failing server twice, then says it is busy", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => new Response("", { status: 503 }));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.refresh(area()));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.error).toBe("Layanan pencarian masjid sedang sibuk. Coba lagi beberapa saat.");
    expect(result.current.loading).toBe(false);
  });

  it("asks nothing while offline", () => {
    useStore.setState({ isOffline: true });
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Anda sedang offline. Periksa koneksi internet Anda.");
  });
});
