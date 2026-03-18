import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ScheduleTable from "./ScheduleTable";
import { useStore } from "@/store/useStore";

// Mock the store
vi.mock("@/store/useStore", () => ({
  useStore: vi.fn(),
}));

// Mock the dependencies
vi.mock("@/lib/hijri", () => ({
  getHijriParts: vi.fn().mockReturnValue({ day: 1, monthName: "Ramadhan", year: 1445 }),
  getHijriMonthsForGregorianMonth: vi.fn().mockReturnValue([{ monthName: "Ramadhan", year: 1445 }]),
}));

vi.mock("@/lib/time", () => ({
  getAdjustedTime: vi.fn().mockReturnValue(new Date("2024-03-12T12:00:00Z")),
}));

vi.mock("@/lib/timezone", () => ({
  getUtcOffset: vi.fn().mockReturnValue(7),
}));

const mockFetchScheduleForMonth = vi.fn();

const defaultStoreState = {
  schedule: {
    data: [],
    loading: false,
    error: null,
  },
  location: {
    cityId: "1301",
    cityName: "Kota Jakarta",
    province: "DKI Jakarta",
    timezone: "WIB",
  },
  timeOffset: 0,
  viewMonth: 3,
  viewYear: 2024,
  fetchScheduleForMonth: mockFetchScheduleForMonth,
};

describe("ScheduleTable Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) =>
      selector(defaultStoreState)
    );
  });

  it("renders empty state when no schedule is selected", () => {
    render(<ScheduleTable />);
    expect(screen.getByText("Pilih kota untuk melihat jadwal sholat.")).toBeInTheDocument();
  });

  it("renders error state when schedule fetch fails", () => {
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) =>
      selector({
        ...defaultStoreState,
        schedule: { data: [], loading: false, error: "Gagal memuat jadwal" },
      })
    );

    render(<ScheduleTable />);
    expect(screen.getByText("Gagal memuat jadwal")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /coba lagi/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockFetchScheduleForMonth).toHaveBeenCalledWith(2024, 3);
  });

  it("renders skeleton rows when loading", () => {
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) =>
      selector({
        ...defaultStoreState,
        schedule: { data: [], loading: true, error: null },
      })
    );

    const { container } = render(<ScheduleTable />);

    // Skeleton should be visible instead of actual data rows
    // It's rendered in two places: MobileSkeletonCards and SkeletonRows
    const skeletons = container.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders schedule data correctly", () => {
    const mockData = [
      {
        tanggal: "Selasa, 12/03/2024",
        date: "2024-03-12",
        imsak: "04:32",
        subuh: "04:42",
        terbit: "05:54",
        dhuha: "06:21",
        dzuhur: "12:05",
        ashar: "15:10",
        maghrib: "18:10",
        isya: "19:18",
      },
    ];

    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) =>
      selector({
        ...defaultStoreState,
        schedule: { data: mockData, loading: false, error: null },
      })
    );

    render(<ScheduleTable />);

    // Should render month navigation info
    expect(screen.getByText("Maret 2024")).toBeInTheDocument();

    // Check if data is displayed
    const imsakTime = screen.getAllByText("04:32");
    expect(imsakTime.length).toBeGreaterThan(0); // Should appear in table and mobile card

    const isyaTime = screen.getAllByText("19:18");
    expect(isyaTime.length).toBeGreaterThan(0);
  });

  it("allows navigating to previous and next month", () => {
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) =>
      selector({
        ...defaultStoreState,
        schedule: { data: [{
          tanggal: "Selasa, 12/03/2024",
          date: "2024-03-12",
          imsak: "04:32",
          subuh: "04:42",
          terbit: "05:54",
          dhuha: "06:21",
          dzuhur: "12:05",
          ashar: "15:10",
          maghrib: "18:10",
          isya: "19:18",
        }], loading: false, error: null },
      })
    );

    render(<ScheduleTable />);

    const prevButton = screen.getByLabelText("Bulan sebelumnya");
    const nextButton = screen.getByLabelText("Bulan berikutnya");

    fireEvent.click(prevButton);
    expect(mockFetchScheduleForMonth).toHaveBeenCalledWith(2024, 2);

    fireEvent.click(nextButton);
    expect(mockFetchScheduleForMonth).toHaveBeenCalledWith(2024, 4);
  });

  it("navigates to current month when 'Hari Ini' is clicked", () => {
     (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) =>
      selector({
        ...defaultStoreState,
        viewMonth: 2, // Not current month
        schedule: { data: [{
          tanggal: "Selasa, 12/02/2024",
          date: "2024-02-12",
          imsak: "04:32",
          subuh: "04:42",
          terbit: "05:54",
          dhuha: "06:21",
          dzuhur: "12:05",
          ashar: "15:10",
          maghrib: "18:10",
          isya: "19:18",
        }], loading: false, error: null },
      })
    );

    // Mock Date for stable 'current month' testing
    const mockDate = new Date("2024-03-12T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    render(<ScheduleTable />);

    const todayButton = screen.getByRole("button", { name: "Hari Ini" });
    fireEvent.click(todayButton);

    // 2024, month 3 (March is month 2 in zero-index Date, but viewMonth uses 1-12)
    expect(mockFetchScheduleForMonth).toHaveBeenCalledWith(2024, 3);

    vi.useRealTimers();
  });
});
