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

// Mock CITIES to prevent heavy filtering during tests
vi.mock("@/lib/cities", () => {
  const CITIES = [{ id: "test-city", name: "TEST CITY", lat: -6.2, lng: 106.8 }];
  return { CITIES, findCityCoords: (name: string) => CITIES.find((c) => c.name === name) ?? null };
});

// Mock mosques utils to return a predictable distance
vi.mock("@/lib/mosques", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getSearchRadius: () => 2000,
  };
});

// Provide minimal implementation of AbortController if not globally present
if (typeof global.AbortController === "undefined") {
  global.AbortController = vi.fn().mockImplementation(() => ({
    abort: vi.fn(),
    signal: {
      aborted: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any;
}

// Mock global fetch
global.fetch = vi.fn();

describe("MosqueFinder Component - U6 Fixes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Also drops queued one-off implementations a failed test may have left behind
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any).mockReset();
    localStorage.clear();

    // Reset store state
    useStore.setState({
      location: { cityId: "test-city", cityName: "TEST CITY", province: "TEST PROV", timezone: "WIB" },
      userCoords: { lat: -6.2, lng: 106.8 },
      isOffline: false
    });

    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setupAndClickRefresh = async (fetchMockImplementation: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any).mockImplementation(fetchMockImplementation);

    render(<MosqueFinder />);

    // Fast-forward initial coords setup and effect run
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const refreshBtn = screen.getByRole("button", { name: "Muat ulang daftar masjid" });

    await act(async () => {
      fireEvent.click(refreshBtn);
    });

    // Let any promises resolve
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
  };

  it("displays distinct 'no results' message when API returns empty data", async () => {
    await setupAndClickRefresh(async () => ({
      ok: true,
      json: async () => ({ status: true, data: [] }),
    }));

    await waitFor(() => {
      expect(screen.getByText(/Tidak ada masjid ditemukan dalam radius/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Coba perbesar radius atau pindah lokasi/)).toBeInTheDocument();
  });

  it("displays distinct 'API error' message when API returns an error without custom text", async () => {
    await setupAndClickRefresh(async () => ({
      ok: true,
      json: async () => ({ status: false }), // no data.error provided, testing fallback
    }));

    await waitFor(() => {
      expect(screen.getByText("Server gagal memuat data masjid. Coba tekan Muat Ulang.")).toBeInTheDocument();
    });
  });

  it("displays distinct 'API error' message when API returns custom error text", async () => {
    await setupAndClickRefresh(async () => ({
      ok: true,
      json: async () => ({ status: false, error: "Custom API Error" }),
    }));

    await waitFor(() => {
      expect(screen.getByText("Custom API Error")).toBeInTheDocument();
    });
  });

  it("keeps the location, the search and the results out of Clarity recordings", async () => {
    await setupAndClickRefresh(async () => ({
      ok: true,
      json: async () => ({
        status: true,
        data: [{ id: "m1", name: "Masjid Raya", lat: -6.2, lng: 106.8, type: "masjid", distance: 0 }],
      }),
    }));

    await waitFor(() => {
      expect(screen.getByText("Masjid Raya")).toBeInTheDocument();
    });
    const masked = '[data-clarity-mask="True"]';
    expect(screen.getByText("Masjid Raya").closest(masked)).not.toBeNull();
    expect(screen.getByText("Lokasi GPS Anda").closest(masked)).not.toBeNull();
    expect(screen.getByRole("combobox").closest(masked)).not.toBeNull();
  });

  const okResponse = (mosques: object[]) => ({
    ok: true,
    status: 200,
    json: async () => ({ status: true, data: mosques }),
  });
  const mosque = (id: string, name: string, lng = 106.8) => ({ id, name, lat: -6.2, lng, type: "masjid", distance: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchMock = () => global.fetch as any;
  const requestedRadius = (call: number) => new URL(fetchMock().mock.calls[call][0], "http://x").searchParams.get("radius");

  it("keeps the wider radius for 'Muat Ulang' after 'Perluas Pencarian'", async () => {
    fetchMock().mockImplementation(async () => okResponse([mosque("m1", "Masjid Raya")]));
    render(<MosqueFinder />);
    await waitFor(() => expect(screen.getByText("Masjid Raya")).toBeInTheDocument());
    expect(requestedRadius(0)).toBe("2000");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Perluas Pencarian/ }));
    });
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(2));
    expect(requestedRadius(1)).toBe("4000");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Muat ulang daftar masjid" }));
    });
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(3));
    expect(requestedRadius(2)).toBe("4000");
    expect(screen.getByRole("button", { name: /Perluas Pencarian \(4 km → 8 km\)/ })).toBeInTheDocument();
  });

  it("never lets a slow older search replace a newer one", async () => {
    let finishFirst!: (v: unknown) => void;
    fetchMock()
      .mockImplementationOnce(() => new Promise((r) => { finishFirst = r; }))
      .mockImplementationOnce(async () => okResponse([mosque("new", "Masjid Baru")]));
    render(<MosqueFinder />);
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // A newer search (here: the user switches to a city) finishes first
    const input = screen.getByRole("combobox");
    await act(async () => {
      fireEvent.change(input, { target: { value: "TEST" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: "TEST CITY" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Muat ulang daftar masjid" }));
    });
    await waitFor(() => expect(screen.getByText("Masjid Baru")).toBeInTheDocument());

    await act(async () => {
      finishFirst(okResponse([mosque("old", "Masjid Lama")]));
    });
    expect(screen.queryByText("Masjid Lama")).not.toBeInTheDocument();
    expect(screen.getByText("Masjid Baru")).toBeInTheDocument();
  });

  it("measures cached results from the current position", async () => {
    // Cached by a visit ~1 km away, when this mosque was 5 m from the user
    localStorage.setItem(
      "si:mosques:-6.20:106.80:2000",
      JSON.stringify({ v: 1, ts: Date.now(), data: [{ ...mosque("m1", "Masjid Dekat", 106.81), distance: 5 }] })
    );
    render(<MosqueFinder />);

    await waitFor(() => expect(screen.getByText("Masjid Dekat")).toBeInTheDocument());
    expect(fetchMock()).not.toHaveBeenCalled();
    expect(screen.getByText("1.1 km")).toBeInTheDocument();
  });

  it("displays distinct 'network error' message when fetch throws", async () => {
    await setupAndClickRefresh(async () => {
      throw new Error("Network Error");
    });

    await waitFor(() => {
      expect(screen.getByText("Gagal terhubung ke server. Periksa koneksi internet dan coba lagi.")).toBeInTheDocument();
    });
  });
});
