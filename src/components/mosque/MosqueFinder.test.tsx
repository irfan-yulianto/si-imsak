import { render, screen, waitFor, act, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import MosqueFinder from "./MosqueFinder";
import { useStore } from "@/store/useStore";

// Mock the icons to keep the DOM simple
vi.mock("@/components/ui/Icons", () => ({
  MosqueIcon: () => <div data-testid="mosque-icon" />,
  MapPinIcon: () => <div data-testid="map-pin-icon" />,
  SearchIcon: () => <div data-testid="search-icon" />,
  XIcon: () => <div data-testid="x-icon" />,
  // For the finder's own icons (./icons)
  defaultProps: () => ({}),
}));

// A small city table instead of the 500+ cities
vi.mock("@/lib/cities", () => {
  const CITIES = [
    { id: "test-city", name: "TEST CITY", lat: -6.2, lng: 106.8 },
    { id: "other-city", name: "OTHER CITY", lat: -6.9, lng: 107.6 },
  ];
  return { CITIES, findCityCoords: (name: string) => CITIES.find((c) => c.name === name) ?? null };
});

type Success = (pos: GeolocationPosition) => void;
type Failure = (err: GeolocationPositionError) => void;
let onPosition: Success = () => {};
let onError: Failure = () => {};
const geolocation = {
  watchPosition: vi.fn<(success: Success, failure: Failure, options?: PositionOptions) => number>((success, failure) => {
    onPosition = success;
    onError = failure;
    return 1;
  }),
  clearWatch: vi.fn(),
};
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
/** A GPS fix `north` meters north of TEST CITY's centre */
const gpsFix = (accuracy: number, north = 0) =>
  ({ coords: { latitude: -6.2 + north / 111_200, longitude: 106.8, accuracy }, timestamp: Date.now() }) as GeolocationPosition;

/** What the browser says about the location permission; undefined: no Permissions API */
function allowLocation(state: PermissionState | undefined, userAgent = "") {
  const permissions =
    state && { query: vi.fn(async () => ({ state, addEventListener: vi.fn(), removeEventListener: vi.fn() })) };
  vi.stubGlobal("navigator", { ...navigator, geolocation, permissions, userAgent });
}

const fetchMock = vi.fn();
/** The server's answer: these mosques, complete (as it would say) to 25 km around the point asked about */
const okResponse = (mosques: object[], url?: string) => {
  const asked = url ? new URL(url, "http://x").searchParams : null;
  const meta = asked && { center: { lat: Number(asked.get("lat")), lng: Number(asked.get("lng")) }, coverage: 25_000, dataDate: "2026-10-06" };
  return { ok: true, status: 200, json: async () => ({ status: true, data: mosques, ...(meta && { meta }) }) };
};
/** As okResponse, for every request */
const answering = (mosques: object[]) => async (url: string) => okResponse(mosques, url);
const mosque = (id: string, name: string, north = 0, distance = 0) => ({
  id,
  name,
  lat: -6.2 + north / 111_200,
  lng: 106.8,
  type: "masjid",
  distance,
});
/** The server's answer: these mosques, `north` meters north of the point asked about */
const around =
  (...list: [id: string, name: string, north?: number][]) =>
  async (url: string) => {
    const asked = new URL(url, "http://x").searchParams;
    const lat = Number(asked.get("lat"));
    const lng = Number(asked.get("lng"));
    return okResponse(
      list.map(([id, name, north = 0]) => ({ id, name, lat: lat + north / 111_200, lng, type: "masjid", distance: north })),
      url
    );
  };
const requested = (call: number) => new URL(fetchMock.mock.calls[call][0], "http://x").searchParams;
const names = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  allowLocation("prompt");
  useStore.setState({
    location: { cityId: "test-city", cityName: "TEST CITY", province: "TEST PROV", timezone: "WIB" },
    // A sharp fix of a moment ago: the GPS needn't start again
    userCoords: { lat: -6.2, lng: 106.8, accuracy: 20, at: Date.now() },
    isOffline: false,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MosqueFinder: where it searches", () => {
  it("starts the GPS by itself where the location is allowed, and searches around the first fix", async () => {
    allowLocation("granted");
    useStore.setState({ userCoords: null });
    fetchMock.mockImplementation(answering([mosque("m1", "Masjid Dekat", 100, 100)]));
    render(<MosqueFinder />);

    await waitFor(() => expect(geolocation.watchPosition).toHaveBeenCalled());
    expect(screen.getByText("Mendeteksi lokasi…")).toBeInTheDocument();
    // Not the city's centre in the meantime: its results would be replaced at once
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => onPosition(gpsFix(30, 1000)));
    await waitFor(() => expect(screen.getByText("Masjid Dekat")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // ~1 km is all the server learns
    expect(requested(0).get("lat")).toBe("-6.19");
    expect(screen.getByText("Lokasi GPS Anda")).toBeInTheDocument();
  });

  it("where the location isn't allowed yet, searches around the city's centre and says so", async () => {
    useStore.setState({ userCoords: null });
    fetchMock.mockImplementation(answering([mosque("m1", "Masjid Pusat")]));
    render(<MosqueFinder />);

    await waitFor(() => expect(screen.getByText("Masjid Pusat")).toBeInTheDocument());
    expect(requested(0).get("lat")).toBe("-6.2");
    expect(screen.getByText("Sekitar pusat TEST CITY, bukan lokasi Anda")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gunakan Lokasi GPS" })).toBeInTheDocument();
    expect(geolocation.watchPosition).not.toHaveBeenCalled();
  });

  it("does the same in a browser that can't tell", async () => {
    allowLocation(undefined);
    useStore.setState({ userCoords: null });
    fetchMock.mockImplementation(answering([mosque("m1", "Masjid Pusat")]));
    render(<MosqueFinder />);
    await waitFor(() => expect(screen.getByText("Masjid Pusat")).toBeInTheDocument());
    expect(geolocation.watchPosition).not.toHaveBeenCalled();
  });

  it("searches around the city's centre when the GPS is cancelled before a first fix", async () => {
    allowLocation("granted");
    useStore.setState({ userCoords: null });
    fetchMock.mockImplementation(answering([mosque("m1", "Masjid Pusat")]));
    render(<MosqueFinder />);
    await waitFor(() => expect(screen.getByText("Mendeteksi lokasi…")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Batal mendeteksi lokasi" }));
    await waitFor(() => expect(screen.getByText("Masjid Pusat")).toBeInTheDocument());
    expect(screen.getByText("Sekitar pusat TEST CITY, bukan lokasi Anda")).toBeInTheDocument();
  });

  it("sharpens a rough fix from the city detection, keeping it until a better reading", async () => {
    allowLocation("granted");
    useStore.setState({ userCoords: { lat: -6.2, lng: 106.8, accuracy: 900, at: Date.now() } });
    fetchMock.mockImplementation(answering([mosque("m1", "Masjid Dekat")]));
    render(<MosqueFinder />);

    // Results around the rough fix at once, and the GPS sharpens it meanwhile
    await waitFor(() => expect(screen.getByText("Masjid Dekat")).toBeInTheDocument());
    expect(geolocation.watchPosition).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Akurasi rendah ±900m")).toBeInTheDocument();
    expect(screen.getByText("Mempertajam lokasi… ±900m")).toBeInTheDocument();

    // A reading no better than the fix in hand changes nothing
    act(() => onPosition(gpsFix(1000)));
    expect(screen.getByText("Akurasi rendah ±900m")).toBeInTheDocument();
    act(() => onPosition(gpsFix(30)));
    await waitFor(() => expect(screen.getByText("GPS akurat ±30m")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Perbarui Lokasi GPS" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sharpens a rough fix in hand even where the browser can't tell the permission", async () => {
    allowLocation(undefined);
    useStore.setState({ userCoords: { lat: -6.2, lng: 106.8, accuracy: 900, at: Date.now() } });
    fetchMock.mockImplementation(answering([mosque("m1", "Masjid Dekat")]));
    render(<MosqueFinder />);
    await waitFor(() => expect(screen.getByText("Masjid Dekat")).toBeInTheDocument());
    expect(geolocation.watchPosition).toHaveBeenCalledTimes(1);

    // Quietly: a failure leaves the fix in hand, without a message
    act(() => onError({ code: 3, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Akurasi rendah ±900m")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Perbarui Lokasi GPS" })).toBeInTheDocument();
  });

  it("on Perbarui, asks for a new reading and keeps the fix in hand unless it is bettered", async () => {
    // The permission is still to be asked for; the sharp fix of a moment ago is in hand
    fetchMock.mockImplementation(answering([mosque("m1", "Masjid Dekat")]));
    render(<MosqueFinder />);
    await waitFor(() => expect(screen.getByText("Masjid Dekat")).toBeInTheDocument());
    expect(geolocation.watchPosition).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Perbarui Lokasi GPS" }));
    expect(geolocation.watchPosition.mock.calls[0][2]).toMatchObject({ maximumAge: 0 });
    expect(screen.getByText("Mempertajam lokasi… ±20m")).toBeInTheDocument();

    // A rougher reading of the same spot: the fix in hand stays, and so does the list
    act(() => onPosition(gpsFix(150)));
    expect(screen.getByText("GPS akurat ±20m")).toBeInTheDocument();
    expect(screen.getByText("Mempertajam lokasi… ±20m")).toBeInTheDocument();
    // A sharp one confirms it: done
    act(() => onPosition(gpsFix(30)));
    expect(screen.getByText("GPS akurat ±20m")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Perbarui Lokasi GPS" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the distances as roughly as the position is known", async () => {
    allowLocation("granted");
    useStore.setState({ userCoords: null });
    fetchMock.mockImplementation(answering([mosque("a", "Masjid Selatan", 0, 0), mosque("b", "Masjid Utara", 600, 600)]));
    render(<MosqueFinder />);
    await waitFor(() => expect(geolocation.watchPosition).toHaveBeenCalled());

    act(() => onPosition(gpsFix(400)));
    await waitFor(() => expect(screen.getByText("~100 m")).toBeInTheDocument());
    expect(screen.getByText("~600 m")).toBeInTheDocument();
    expect(screen.getByText(/^Jarak hanya kira-kira: diukur dalam garis lurus dari posisi ±400 m\./)).toBeInTheDocument();

    act(() => onPosition(gpsFix(30, 100)));
    await waitFor(() => expect(screen.getByText("100 m")).toBeInTheDocument());
    expect(screen.getByText("500 m")).toBeInTheDocument();
    expect(screen.getByText(/^Jarak diukur dalam garis lurus\./)).toBeInTheDocument();
  });

  it("after a minute at an approximate position, says how to allow the accurate one", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    allowLocation("granted", ANDROID);
    useStore.setState({ userCoords: null });
    fetchMock.mockImplementation(answering([mosque("m1", "Masjid Dekat", 100, 100)]));
    render(<MosqueFinder />);
    await waitFor(() => expect(geolocation.watchPosition).toHaveBeenCalled());

    // Android's approximate location: exactly 2 km
    act(() => onPosition(gpsFix(2000)));
    await waitFor(() => expect(screen.getByText("Masjid Dekat")).toBeInTheDocument());
    expect(screen.getByText("Akurasi rendah ±2000m")).toBeInTheDocument();
    expect(screen.getByText("≤ 2.5 km")).toBeInTheDocument();
    expect(screen.queryByText(/lokasi perkiraan/)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText(/^Browser hanya mendapat lokasi perkiraan/)).toHaveTextContent(
      'buka Setelan → Aplikasi → browser Anda (misalnya Chrome) → Izin → Lokasi, lalu aktifkan "Gunakan lokasi akurat", lalu tekan Perbarui Lokasi GPS.'
    );
    expect(screen.getByRole("button", { name: "Perbarui Lokasi GPS" })).toBeInTheDocument();
  });

  it("orders the results again as the fix sharpens, without asking the server again", async () => {
    allowLocation("granted");
    useStore.setState({ userCoords: null });
    fetchMock.mockImplementation(answering([mosque("a", "Masjid Selatan", 0, 0), mosque("b", "Masjid Utara", 600, 600)]));
    render(<MosqueFinder />);
    await waitFor(() => expect(geolocation.watchPosition).toHaveBeenCalled());

    act(() => onPosition(gpsFix(400)));
    await waitFor(() => expect(names()).toEqual(["Masjid Selatan", "Masjid Utara"]));
    // 500 m north, and sharper: Masjid Utara is now the nearest
    act(() => onPosition(gpsFix(30, 500)));
    await waitFor(() => expect(names()).toEqual(["Masjid Utara", "Masjid Selatan"]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a city picked here until the GPS is used again, and stops the GPS for it", async () => {
    allowLocation("granted");
    useStore.setState({ userCoords: null });
    fetchMock.mockImplementation(around(["m1", "Masjid Kota"]));
    render(<MosqueFinder />);
    await waitFor(() => expect(geolocation.watchPosition).toHaveBeenCalled());

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "OTHER" } });
    fireEvent.click(screen.getByRole("option", { name: "OTHER CITY" }));
    expect(geolocation.clearWatch).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("Masjid Kota")).toBeInTheDocument());
    expect(requested(0).get("lat")).toBe("-6.9");
    expect(screen.getByText("Sekitar pusat OTHER CITY")).toBeInTheDocument();

    // A fix from the stopped watch changes nothing
    act(() => onPosition(gpsFix(20)));
    expect(screen.getByText("Sekitar pusat OTHER CITY")).toBeInTheDocument();
  });
});

describe("MosqueFinder: results", () => {
  it("never lets a slow older search replace a newer one", async () => {
    let finishFirst!: (v: unknown) => void;
    fetchMock
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
      .mockImplementationOnce(around(["new", "Masjid Baru"]));
    render(<MosqueFinder />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // A newer search (here: the user picks a city) finishes first
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "OTHER" } });
    fireEvent.click(screen.getByRole("option", { name: "OTHER CITY" }));
    await waitFor(() => expect(screen.getByText("Masjid Baru")).toBeInTheDocument());

    await act(async () => {
      finishFirst(okResponse([mosque("old", "Masjid Lama")]));
    });
    expect(screen.queryByText("Masjid Lama")).not.toBeInTheDocument();
    expect(screen.getByText("Masjid Baru")).toBeInTheDocument();
  });

  it("shows 20 at first, and more on request", async () => {
    const many = Array.from({ length: 25 }, (_, i) => mosque(`m${i}`, `Masjid ${i}`, i * 10, i * 10));
    fetchMock.mockImplementation(answering(many));
    render(<MosqueFinder />);
    await waitFor(() => expect(screen.getAllByRole("link", { name: /^Navigasi ke / })).toHaveLength(20));

    fireEvent.click(screen.getByRole("button", { name: "Tampilkan lebih banyak (5 lagi)" }));
    expect(screen.getAllByRole("link", { name: /^Navigasi ke / })).toHaveLength(25);
  });

  it("says 'Di lokasi Anda' at a mosque within 30 m of a sharp fix, and only then", async () => {
    allowLocation("granted");
    useStore.setState({ userCoords: null });
    fetchMock.mockImplementation(answering([mosque("m1", "Masjid Dekat", 20, 20), mosque("m2", "Masjid Jauh", 200, 200)]));
    render(<MosqueFinder />);
    await waitFor(() => expect(geolocation.watchPosition).toHaveBeenCalled());

    // Not from a rough fix
    act(() => onPosition(gpsFix(400)));
    await waitFor(() => expect(screen.getByText("Masjid Dekat")).toBeInTheDocument());
    expect(screen.queryByText("Di lokasi Anda")).toBeNull();
    act(() => onPosition(gpsFix(10)));
    await waitFor(() => expect(screen.getByText("Di lokasi Anda")).toBeInTheDocument());
    expect(screen.getByText("200 m")).toBeInTheDocument();

    // Nor around a city's centre
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "TEST" } });
    fireEvent.click(screen.getByRole("option", { name: "TEST CITY" }));
    await waitFor(() => expect(screen.getByText("20 m")).toBeInTheDocument());
    expect(screen.queryByText("Di lokasi Anda")).toBeNull();
  });

  it("links to Google Maps and OpenStreetMap at the area searched, and credits OpenStreetMap", async () => {
    useStore.setState({ userCoords: { lat: -6.123456, lng: 106.654321, accuracy: 20, at: Date.now() } });
    fetchMock.mockImplementation(around(["m1", "Masjid Raya", 50]));
    render(<MosqueFinder />);
    await waitFor(() => expect(screen.getByText("Masjid Raya")).toBeInTheDocument());

    const maps = screen.getByRole("link", { name: /Cari lebih banyak di Google Maps/ });
    expect(maps).toHaveAttribute("href", "https://www.google.com/maps/search/masjid/@-6.123,106.654,16z");
    expect(screen.getByRole("link", { name: /Laporkan di OpenStreetMap/ })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/note/new#map=18/-6.123/106.654"
    );
    expect(screen.getByRole("link", { name: /kontributor OpenStreetMap/ })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright"
    );
    expect(screen.getByRole("link", { name: /Overture Maps Foundation/ })).toHaveAttribute(
      "href",
      "https://docs.overturemaps.org/attribution/"
    );
    expect(screen.getByText(/serta usulan pengguna aplikasi ini/)).toBeInTheDocument();
  });

  it("marks a place a user suggested, which no map has", async () => {
    fetchMock.mockImplementation(around(["c12", "Musholla Usulan Warga", 80], ["n1", "Masjid Peta", 200]));
    render(<MosqueFinder />);
    await waitFor(() => expect(screen.getByText("Musholla Usulan Warga")).toBeInTheDocument());
    expect(screen.getByText("Usulan pengguna")).toBeInTheDocument();
    expect(screen.getByText("Musholla Usulan Warga").closest("li")).toContainElement(screen.getByText("Usulan pengguna"));
  });

  it("keeps the location, the search, the results and the links out of Clarity recordings", async () => {
    fetchMock.mockImplementation(answering([mosque("m1", "Masjid Raya")]));
    render(<MosqueFinder />);
    await waitFor(() => expect(screen.getByText("Masjid Raya")).toBeInTheDocument());

    const masked = '[data-clarity-mask="True"]';
    expect(screen.getByText("Masjid Raya").closest(masked)).not.toBeNull();
    expect(screen.getByText("Lokasi GPS Anda").closest(masked)).not.toBeNull();
    expect(screen.getByRole("combobox").closest(masked)).not.toBeNull();
    expect(screen.getByRole("link", { name: /Cari lebih banyak di Google Maps/ }).closest(masked)).not.toBeNull();
  });
});

describe("MosqueFinder: messages", () => {
  it("says when nothing is recorded within the distance searched", async () => {
    fetchMock.mockImplementation(answering([]));
    render(<MosqueFinder />);
    await waitFor(() =>
      expect(
        screen.getByText(
          "Tidak ada masjid atau musholla yang tercatat dalam 25 km. Coba cari di Google Maps, atau laporkan yang Anda tahu di OpenStreetMap."
        )
      ).toBeInTheDocument()
    );
  });

  it("says the server failed when it answers without data or reason", async () => {
    fetchMock.mockImplementation(async () => ({ ok: true, status: 200, json: async () => ({ status: false }) }));
    render(<MosqueFinder />);
    await waitFor(() =>
      expect(screen.getByText("Server gagal memuat data masjid. Coba tekan Muat Ulang.")).toBeInTheDocument()
    );
  });

  it("passes on the server's own reason", async () => {
    fetchMock.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: false, error: "Custom API Error" }),
    }));
    render(<MosqueFinder />);
    await waitFor(() => expect(screen.getByText("Custom API Error")).toBeInTheDocument());
  });

  it("says when the server can't be reached", async () => {
    fetchMock.mockImplementation(async () => {
      throw new Error("Network Error");
    });
    render(<MosqueFinder />);
    await waitFor(() =>
      expect(screen.getByText("Gagal terhubung ke server. Periksa koneksi internet dan coba lagi.")).toBeInTheDocument()
    );
  });
});
