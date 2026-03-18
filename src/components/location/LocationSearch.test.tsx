import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LocationSearch from "./LocationSearch";
import { useStore } from "@/store/useStore";
import { searchCities, getSchedule } from "@/lib/api";
import { detectAndUpdateLocation } from "@/lib/detect-location";

// Mock dependencies
vi.mock("@/lib/api", () => ({
  searchCities: vi.fn(),
  getSchedule: vi.fn(),
}));

vi.mock("@/lib/detect-location", () => ({
  detectAndUpdateLocation: vi.fn(),
}));

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
  })) as any;
}

// Ensure cleanup after each test
afterEach(() => {
  cleanup();
});

describe("LocationSearch Component", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Clear localStorage
    localStorage.clear();

    // Reset store state
    const store = useStore.getState();
    store.setLocation(
      { id: "default-id", lokasi: "DEFAULT CITY", daerah: "DEFAULT PROVINCE" },
      "WIB"
    );
    store.setSchedule([]);
    store.setCountdownSchedule([]);
    store.setScheduleLoading(false);
    store.setScheduleError(null);

    vi.useFakeTimers({
      shouldAdvanceTime: true
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  it("renders location permission prompt when no saved location exists", async () => {
    render(<LocationSearch />);

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(
      screen.getByText("Gunakan lokasi Anda untuk menampilkan jadwal yang sesuai?")
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Gunakan Lokasi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nanti" })).toBeInTheDocument();
  });

  it("fetches schedule on mount if location is saved in localStorage", async () => {
    const mockLocation = { id: "test-id", lokasi: "TEST CITY", daerah: "TEST PROV" };
    localStorage.setItem("selectedLocation", JSON.stringify(mockLocation));

    vi.mocked(getSchedule).mockResolvedValue({
      status: true,
      data: {
        id: "test-id",
        lokasi: "TEST CITY",
        daerah: "TEST PROV",
        jadwal: [],
      },
    });

    render(<LocationSearch />);

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(getSchedule).toHaveBeenCalledWith(
        "test-id",
        expect.any(Number),
        expect.any(Number)
      );
    });

    // Prompt should not be shown
    expect(
      screen.queryByText("Gunakan lokasi Anda untuk menampilkan jadwal yang sesuai?")
    ).not.toBeInTheDocument();
  });

  it("handles dismissing the location prompt", async () => {
    render(<LocationSearch />);

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const dismissBtn = screen.getByRole("button", { name: "Nanti" });

    await act(async () => {
      fireEvent.click(dismissBtn);
    });

    expect(
      screen.queryByText("Gunakan lokasi Anda untuk menampilkan jadwal yang sesuai?")
    ).not.toBeInTheDocument();

    expect(localStorage.getItem("locationPermissionDismissed")).toBeTruthy();
  });

  it("calls detectAndUpdateLocation when 'Gunakan Lokasi' is clicked", async () => {
    vi.mocked(detectAndUpdateLocation).mockResolvedValue({ success: true });

    render(<LocationSearch />);

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const btn = screen.getByRole("button", { name: "Gunakan Lokasi" });

    await act(async () => {
      fireEvent.click(btn);
    });

    expect(detectAndUpdateLocation).toHaveBeenCalled();
    expect(
      screen.queryByText("Gunakan lokasi Anda untuk menampilkan jadwal yang sesuai?")
    ).not.toBeInTheDocument();
  });

  it("debounces search requests and displays results", async () => {
    const mockResults = [
      { id: "1", lokasi: "JAKARTA SELATAN", daerah: "DKI JAKARTA" },
      { id: "2", lokasi: "JAKARTA PUSAT", daerah: "DKI JAKARTA" },
    ];

    vi.mocked(searchCities).mockResolvedValue({ status: true, data: mockResults });

    render(<LocationSearch />);

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText("Cari kota...");

    await act(async () => {
      fireEvent.change(input, { target: { value: "jak" } });
    });

    // Fast-forward debounce timer
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(searchCities).toHaveBeenCalledWith("jak", expect.any(AbortSignal));
    });

    await waitFor(() => {
      expect(screen.getByText("JAKARTA SELATAN")).toBeInTheDocument();
    });
    expect(screen.getByText("JAKARTA PUSAT")).toBeInTheDocument();
  });

  it("shows empty state when no results found", async () => {
    vi.mocked(searchCities).mockResolvedValue({ status: true, data: [] });

    render(<LocationSearch />);

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText("Cari kota...");

    await act(async () => {
      fireEvent.change(input, { target: { value: "xyz" } });
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByText("Kota tidak ditemukan")).toBeInTheDocument();
    });
  });

  it("selects a location and fetches its schedule", async () => {
    const mockResults = [
      { id: "1", lokasi: "BANDUNG", daerah: "JAWA BARAT" },
    ];

    vi.mocked(searchCities).mockResolvedValue({ status: true, data: mockResults });
    vi.mocked(getSchedule).mockResolvedValue({
      status: true,
      data: {
        id: "1",
        lokasi: "BANDUNG",
        daerah: "JAWA BARAT",
        jadwal: [],
      },
    });

    render(<LocationSearch />);

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText("Cari kota...");

    await act(async () => {
      fireEvent.change(input, { target: { value: "ban" } });
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText("BANDUNG")).toBeInTheDocument();
    });

    // Click the result
    const resultBtn = screen.getByRole("button", { name: "BANDUNG" });
    await act(async () => {
      fireEvent.click(resultBtn);
    });

    // Input should be cleared
    expect(input).toHaveValue("");

    // Result dropdown should be closed
    expect(screen.queryByText("BANDUNG")).not.toBeInTheDocument();

    // LocalStorage should be updated
    const saved = JSON.parse(localStorage.getItem("selectedLocation") || "{}");
    expect(saved.id).toBe("1");
    expect(saved.lokasi).toBe("BANDUNG");

    // Schedule should be fetched
    await waitFor(() => {
      expect(getSchedule).toHaveBeenCalledWith("1", expect.any(Number), expect.any(Number));
    });
  });

  it("closes dropdown on Escape key", async () => {
    const mockResults = [{ id: "1", lokasi: "TEST", daerah: "TEST" }];
    vi.mocked(searchCities).mockResolvedValue({ status: true, data: mockResults });

    render(<LocationSearch />);

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText("Cari kota...");

    await act(async () => {
      fireEvent.change(input, { target: { value: "tes" } });
    });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByText("TEST")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Escape" });
    });

    expect(screen.queryByText("TEST")).not.toBeInTheDocument();
    expect(input).toHaveValue("");
  });
});
