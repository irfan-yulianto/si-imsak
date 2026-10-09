import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMosqueSearch, type SearchArea } from "./useMosqueSearch";
import { resetStore } from "@/__tests__/store";
import { useStore } from "@/store/useStore";

const MONAS = { lat: -6.1754, lng: 106.8272 };
/** `meters` south of Monas */
const south = (meters: number) => ({ lat: MONAS.lat - meters / 111_200, lng: MONAS.lng });
const area = (overrides: Partial<SearchArea> = {}): SearchArea => ({ coords: MONAS, radius: 2000, basis: "gps", ...overrides });
const mosque = { id: "node/1", name: "Masjid Istiqlal", lat: -6.1702, lng: 106.8314, distance: 730, type: "masjid" };
/** `count` mosques due north of Monas, `every` meters apart, listed as the server would (distance from the center) */
const northOfMonas = (count: number, every = 11.12) =>
  Array.from({ length: count }, (_, i) => ({
    id: `node/${i}`,
    name: `Masjid ${i}`,
    lat: MONAS.lat + ((i + 1) * every) / 111_200,
    lng: MONAS.lng,
    distance: (i + 1) * every,
    type: "masjid",
  }));
const ok = (data: object[]) => new Response(JSON.stringify({ status: true, data }), { status: 200 });

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
  it("asks for the position rounded to ~110 m, and tells where it searched", async () => {
    fetchMock.mockImplementation(async () => ok([mosque]));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    await waitFor(() => expect(result.current.answer).not.toBeNull());

    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://x");
    expect(url.pathname).toBe("/api/mosques");
    expect(Object.fromEntries(url.searchParams)).toEqual({ lat: "-6.175", lng: "106.827", radius: "2000" });
    expect(result.current.answer).toMatchObject({
      basis: "gps",
      center: { lat: -6.175, lng: 106.827 },
      radius: 2000,
      // Fewer than the limit: everything within the radius is there
      coverage: 2000,
      mosques: [expect.objectContaining({ name: "Masjid Istiqlal" })],
    });
  });

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
    await waitFor(() => expect(result.current.answer?.radius).toBe(4000));
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
    fetchMock.mockImplementation(async () => ok([mosque]));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    await waitFor(() => expect(result.current.answer).not.toBeNull());

    act(() => result.current.follow(area({ coords: south(50) })));
    act(() => result.current.follow(area({ coords: south(400) })));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("searches again once the position leaves what the answer covers", async () => {
    // 50 found (the limit) within ~556 m: complete to that distance only
    fetchMock.mockImplementation(async () => ok(northOfMonas(50)));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    await waitFor(() => expect(result.current.answer?.coverage).toBeCloseTo(556, 0));

    // 300 m south: the ones within 256 m are sure, none of them is
    act(() => result.current.follow(area({ coords: south(300) })));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const url = new URL(String(fetchMock.mock.calls[1][0]), "http://x");
    expect(url.searchParams.get("lat")).toBe("-6.178");
  });

  it("awaits a search on its way for a nearby position, then looks again from where it ended up", async () => {
    let answerFirst!: (res: Response) => void;
    fetchMock
      .mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)))
      .mockImplementation(async () => ok(northOfMonas(50, 2)));
    const { result } = renderHook(() => useMosqueSearch());

    act(() => result.current.follow(area()));
    // Fixes keep coming while the answer is on its way: it isn't restarted for each
    act(() => result.current.follow(area({ coords: south(100) })));
    act(() => result.current.follow(area({ coords: south(150) })));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 50 within 100 m of Monas, a dense block: from 150 m south, none of them is sure
    await act(async () => answerFirst(ok(northOfMonas(50, 2))));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const url = new URL(String(fetchMock.mock.calls[1][0]), "http://x");
    expect(url.searchParams.get("lat")).toBe("-6.177");
  });

  it("starts again for another basis, even at the same spot", async () => {
    fetchMock.mockImplementation(async () => ok([mosque]));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area({ basis: "pusat:KOTA JAKARTA" })));
    await waitFor(() => expect(result.current.answer?.basis).toBe("pusat:KOTA JAKARTA"));
    act(() => result.current.follow(area({ basis: "gps" })));
    await waitFor(() => expect(result.current.answer?.basis).toBe("gps"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("says when nothing is within the radius", async () => {
    fetchMock.mockImplementation(async () => ok([]));
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    await waitFor(() => expect(result.current.answer?.mosques).toEqual([]));
    expect(result.current.error).toBe(
      "Tidak ada masjid atau musholla ditemukan dalam radius 2 km. Coba perluas pencarian atau pindah lokasi."
    );
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

  it("asks nothing while offline", () => {
    useStore.setState({ isOffline: true });
    const { result } = renderHook(() => useMosqueSearch());
    act(() => result.current.follow(area()));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Anda sedang offline. Periksa koneksi internet Anda.");
  });
});
