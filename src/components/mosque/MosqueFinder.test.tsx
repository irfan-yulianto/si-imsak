import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import MosqueFinder from "./MosqueFinder";
import { useStore } from "@/store/useStore";

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("MosqueFinder U6 fix tests", () => {
  beforeEach(() => {
    useStore.setState({
      location: { cityId: "1", cityName: "Jakarta" },
      userCoords: { lat: -6.2, lng: 106.8 },
      isOffline: false,
    });
    mockFetch.mockClear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows distinct "no results" message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: true, data: [] }),
    });

    await act(async () => {
      render(<MosqueFinder />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Tidak ada masjid ditemukan dalam radius/i)).toBeInTheDocument();
    });
  });

  it('shows distinct "API error" message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: false, error: "Custom API Error" }),
    });

    await act(async () => {
      render(<MosqueFinder />);
    });

    await waitFor(() => {
      expect(screen.getByText("Custom API Error")).toBeInTheDocument();
    });
  });

  it('shows distinct "network error" message', async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network Error"));

    await act(async () => {
      render(<MosqueFinder />);
    });

    await waitFor(() => {
      expect(screen.getByText("Gagal terhubung ke server. Periksa koneksi internet dan coba lagi.")).toBeInTheDocument();
    });
  });
});
