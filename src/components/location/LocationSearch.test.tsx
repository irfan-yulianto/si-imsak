import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LocationSearch from "./LocationSearch";
import { monthId, useStore } from "@/store/useStore";
import { searchCities, getSchedule } from "@/lib/api";
import { resetStore } from "@/__tests__/store";

// Mock dependencies
vi.mock("@/lib/api", () => ({
  searchCities: vi.fn(),
  getSchedule: vi.fn(),
}));

// GPS detection is the store's own (tested in city-slice.test.ts); here it is replaced
const detectCity = vi.fn();

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
  })) as unknown as typeof AbortController;
}

// Ensure cleanup after each test
afterEach(() => {
  cleanup();
});

// page.tsx restores the saved city and decides on the location prompt (hydrateFromCache)
// in a layout effect, before LocationSearch's effects run
function renderAfterHydrate() {
  act(() => useStore.getState().hydrateFromCache());
  return render(<LocationSearch />);
}

describe("LocationSearch Component", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Clear localStorage
    localStorage.clear();

    // Reset store state
    resetStore();
    useStore.setState({
      location: { cityId: "default-id", cityName: "DEFAULT CITY", province: "DEFAULT PROVINCE", timezone: "WIB" },
      detectCity,
    });

    vi.mocked(getSchedule).mockResolvedValue({
      status: true,
      data: { id: "default-id", lokasi: "DEFAULT CITY", daerah: "DEFAULT PROVINCE", jadwal: [] },
    });

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
    renderAfterHydrate();

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
    const mockLocation = { id: "0123456789abcdef0123456789abcdef", lokasi: "TEST CITY", daerah: "TEST PROV" };
    localStorage.setItem("selectedLocation", JSON.stringify(mockLocation));

    vi.mocked(getSchedule).mockResolvedValue({
      status: true,
      data: {
        id: "0123456789abcdef0123456789abcdef",
        lokasi: "TEST CITY",
        daerah: "TEST PROV",
        jadwal: [],
      },
    });

    renderAfterHydrate();

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(getSchedule).toHaveBeenCalledWith(
        "0123456789abcdef0123456789abcdef",
        expect.any(Number),
        expect.any(Number)
      );
    });
    // Loaded once on startup, not once per effect run
    expect(getSchedule).toHaveBeenCalledTimes(1);
    expect(useStore.getState().location.cityName).toBe("TEST CITY");

    // Prompt should not be shown
    expect(
      screen.queryByText("Gunakan lokasi Anda untuk menampilkan jadwal yang sesuai?")
    ).not.toBeInTheDocument();
  });

  it("handles dismissing the location prompt", async () => {
    renderAfterHydrate();

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

  it("detects the city when 'Gunakan Lokasi' is clicked", async () => {
    detectCity.mockResolvedValue({ success: true });

    renderAfterHydrate();

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const btn = screen.getByRole("button", { name: "Gunakan Lokasi" });

    await act(async () => {
      fireEvent.click(btn);
    });

    expect(detectCity).toHaveBeenCalled();
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

    renderAfterHydrate();

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText("Cari kota");

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

    renderAfterHydrate();

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText("Cari kota");

    await act(async () => {
      fireEvent.change(input, { target: { value: "xyz" } });
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toHaveTextContent("Kota tidak ditemukan");
    });
    // Also announced to screen readers
    expect(screen.getByRole("status")).toHaveTextContent("Kota tidak ditemukan");
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

    renderAfterHydrate();

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText("Cari kota");

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
    const resultBtn = screen.getByRole("option", { name: "BANDUNG" });
    await act(async () => {
      fireEvent.click(resultBtn);
    });

    // Input should be cleared
    expect(input).toHaveValue("");

    // Result dropdown should be closed
    expect(screen.queryByRole("option", { name: "BANDUNG" })).not.toBeInTheDocument();

    // LocalStorage should be updated
    const saved = JSON.parse(localStorage.getItem("selectedLocation") || "{}");
    expect(saved.id).toBe("1");
    expect(saved.lokasi).toBe("BANDUNG");

    // Schedule should be fetched
    await waitFor(() => {
      expect(getSchedule).toHaveBeenCalledWith("1", expect.any(Number), expect.any(Number));
    });
  });

  it("closes the list on Escape, then clears the text on a second Escape", async () => {
    const mockResults = [{ id: "1", lokasi: "TEST", daerah: "TEST" }];
    vi.mocked(searchCities).mockResolvedValue({ status: true, data: mockResults });

    renderAfterHydrate();

    // Fast-forward initial useEffects
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText("Cari kota");

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

    expect(screen.queryByRole("option", { name: "TEST" })).not.toBeInTheDocument();
    expect(input).toHaveValue("tes");
    expect(input).toHaveAttribute("aria-expanded", "false");

    await act(async () => {
      fireEvent.keyDown(input, { key: "Escape" });
    });
    expect(input).toHaveValue("");
  });

  it("selects a result with the arrow keys and Enter", async () => {
    vi.mocked(searchCities).mockResolvedValue({
      status: true,
      data: [
        { id: "1", lokasi: "KOTA BOGOR", daerah: "JAWA BARAT" },
        { id: "2", lokasi: "KAB. BOGOR", daerah: "JAWA BARAT" },
      ],
    });
    vi.mocked(getSchedule).mockResolvedValue({ status: true, data: { id: "2", lokasi: "KAB. BOGOR", daerah: "JAWA BARAT", jadwal: [] } });

    renderAfterHydrate();
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const input = screen.getByRole("combobox", { name: "Cari kota" });
    await act(async () => {
      fireEvent.change(input, { target: { value: "bog" } });
    });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const second = screen.getByRole("option", { name: "KAB. BOGOR" });
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", second.id);

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(JSON.parse(localStorage.getItem("selectedLocation") || "{}").id).toBe("2");
  });

  it("keeps the location prompt open with an explanation when detection fails", async () => {
    detectCity.mockResolvedValue({ success: false, error: "Izin lokasi ditolak" });

    renderAfterHydrate();
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Gunakan lokasi Anda untuk menampilkan jadwal yang sesuai?");
    // Focus moves into the prompt
    expect(screen.getByRole("button", { name: "Gunakan Lokasi" })).toHaveFocus();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Gunakan Lokasi" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Izin lokasi ditolak");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tutup" })).toBeInTheDocument();
  });

  it("explains other detection failures with a single full stop", async () => {
    detectCity.mockResolvedValue({ success: false, error: "Gagal mencari kota. Periksa koneksi internet." });

    renderAfterHydrate();
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Gunakan Lokasi" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /^Gagal mencari kota\. Periksa koneksi internet\. Ketik nama kotamu di kolom pencarian\.$/
    );
  });

  it("closes the prompt quietly when the user picked a city during detection", async () => {
    detectCity.mockResolvedValue({ success: false, superseded: true });

    renderAfterHydrate();
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Gunakan Lokasi" }));
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the city search and the prompt out of Clarity recordings", async () => {
    renderAfterHydrate();
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByRole("combobox").closest('[data-clarity-mask="True"]')).not.toBeNull();
    expect(screen.getByRole("dialog").closest('[data-clarity-mask="True"]')).not.toBeNull();
  });

  it("does not show the prompt again within 7 days of dismissing it", async () => {
    localStorage.setItem("locationPermissionDismissed", String(Date.now() - 6 * 24 * 3600000));

    renderAfterHydrate();
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows only the newest city when an older city's schedule arrives late", async () => {
    let resolveFirst!: (v: Awaited<ReturnType<typeof getSchedule>>) => void;
    vi.mocked(getSchedule)
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; })) // startup (DEFAULT CITY)
      .mockResolvedValueOnce({
        status: true,
        data: { id: "1", lokasi: "BANDUNG", daerah: "JAWA BARAT", jadwal: [{ date: "2024-01-01", tanggal: "Senin, 01/01/2024" } as never] },
      });
    vi.mocked(searchCities).mockResolvedValue({ status: true, data: [{ id: "1", lokasi: "BANDUNG", daerah: "JAWA BARAT" }] });

    renderAfterHydrate();
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText("Cari kota");
    await act(async () => {
      fireEvent.change(input, { target: { value: "ban" } });
    });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => expect(screen.getByRole("option", { name: "BANDUNG" })).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: "BANDUNG" }));
    });
    const shown = () => {
      const { months, location, viewYear, viewMonth } = useStore.getState();
      return months[monthId(location.cityId, viewYear, viewMonth)];
    };
    await waitFor(() => expect(shown()?.status).toBe("ready"));

    // The startup request for the previous city finishes last
    await act(async () => {
      resolveFirst({ status: true, data: { id: "default-id", lokasi: "DEFAULT CITY", daerah: "DEFAULT PROVINCE", jadwal: [{ date: "1999-01-01" } as never] } });
    });

    expect(useStore.getState().location.cityName).toBe("BANDUNG");
    // The table and the countdown both show Bandung's month
    expect(shown()?.days[0].date).toBe("2024-01-01");
  });
});
