import { render, screen, waitFor, act, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import MosqueFinder from "./MosqueFinder";
import { useStore } from "@/store/useStore";

// Mock the icons to keep the DOM simple
vi.mock("@/components/ui/Icons", () => ({
  MosqueIcon: () => <div data-testid="mosque-icon" />,
  MapPinIcon: () => <div data-testid="map-pin-icon" />,
  SearchIcon: () => <div data-testid="search-icon" />,
  CrosshairIcon: () => <div data-testid="crosshair-icon" />,
  ExternalLinkIcon: () => <div data-testid="external-link-icon" />
}));

// Mock CITIES to prevent heavy filtering during tests
vi.mock("@/lib/cities", () => ({
  CITIES: [
    { id: "test-city", name: "TEST CITY", lat: -6.2, lng: 106.8 }
  ]
}));

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
    localStorage.clear();

    // Reset store state
    useStore.setState({
      location: { id: "test-city", cityName: "TEST CITY", province: "TEST PROV" },
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

    const refreshBtn = screen.getByText("Refresh");

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
      expect(screen.getByText("Server gagal memuat data masjid. Coba tekan Refresh.")).toBeInTheDocument();
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

  it("displays distinct 'network error' message when fetch throws", async () => {
    await setupAndClickRefresh(async () => {
      throw new Error("Network Error");
    });

    await waitFor(() => {
      expect(screen.getByText("Gagal terhubung ke server. Periksa koneksi internet dan coba lagi.")).toBeInTheDocument();
    });
  });
});
