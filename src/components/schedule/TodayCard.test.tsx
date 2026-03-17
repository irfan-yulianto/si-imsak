import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import TodayCard from "./TodayCard";
import { getAdjustedTime } from "@/lib/time";

// Mock zustand store
const mockUseStore = vi.fn();
vi.mock("@/store/useStore", () => ({
  useStore: (selector: any) => selector(mockUseStore()),
}));

// Mock time utils
vi.mock("@/lib/time", () => ({
  getAdjustedTime: vi.fn(() => new Date("2025-06-15T12:00:00Z")), // Default mock time
}));

// Mock timezone util
vi.mock("@/lib/timezone", () => ({
  getUtcOffset: vi.fn(() => 7), // WIB by default
}));

// Mock hijri util
vi.mock("@/lib/hijri", () => ({
  getHijriDate: vi.fn(() => "15 Dzulhijjah 1446 H"),
}));

// Mock Icons to simplify
vi.mock("@/components/ui/Icons", () => {
  const DummyIcon = () => <svg data-testid="dummy-icon" />;
  return {
    CalendarIcon: DummyIcon,
    PRAYER_ICON_MAP: {
      imsak: DummyIcon,
      subuh: DummyIcon,
      terbit: DummyIcon,
      dhuha: DummyIcon,
      dzuhur: DummyIcon,
      ashar: DummyIcon,
      maghrib: DummyIcon,
      isya: DummyIcon,
    },
  };
});

describe("TodayCard", () => {
  const defaultStoreState = {
    countdownSchedule: [],
    schedule: { loading: false, data: [] },
    location: { timezone: "WIB" },
    timeOffset: 0,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockUseStore.mockReturnValue(defaultStoreState);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders loading state when schedule is loading and no todaySchedule", () => {
    mockUseStore.mockReturnValue({
      ...defaultStoreState,
      schedule: { loading: true, data: [] },
    });
    render(<TodayCard />);
    expect(screen.getByText("Memuat jadwal...")).toBeInTheDocument();
  });

  it("renders empty state when schedule is not loading and no todaySchedule", () => {
    render(<TodayCard />);
    expect(screen.getByText("Jadwal hari ini belum tersedia")).toBeInTheDocument();
  });

  it("renders today's schedule properly", () => {
    // Mock the current time to 2025-06-15T12:00:00Z (UTC)
    // For WIB (+7), this is 2025-06-15 19:00:00 local time
    // But let's mock the getAdjustedTime to something specific and we'll see
    vi.mocked(getAdjustedTime).mockReturnValue(new Date("2025-06-15T05:00:00Z")); // UTC

    // Local time = 12:00:00 WIB (past Dzuhur, before Ashar)
    const todayStr = "2025-06-15";

    const mockCountdownSchedule = [
      {
        tanggal: "Ahad, 15/06/2025",
        date: todayStr,
        imsak: "04:15",
        subuh: "04:25",
        terbit: "05:40",
        dhuha: "06:05",
        dzuhur: "11:45",
        ashar: "15:05",
        maghrib: "17:40",
        isya: "18:55",
      },
    ];

    mockUseStore.mockReturnValue({
      ...defaultStoreState,
      countdownSchedule: mockCountdownSchedule,
    });

    render(<TodayCard />);

    // Check day and formatted date
    expect(screen.getByText(/Ahad,/)).toBeInTheDocument();
    expect(screen.getByText(/15 Juni 2025/)).toBeInTheDocument();

    // Check hijri banner
    expect(screen.getByText("15 Dzulhijjah 1446 H")).toBeInTheDocument();

    // Check all prayer times
    expect(screen.getByText("04:15")).toBeInTheDocument();
    expect(screen.getByText("11:45")).toBeInTheDocument();
    expect(screen.getByText("15:05")).toBeInTheDocument();
    expect(screen.getByText("18:55")).toBeInTheDocument();
  });

  it("highlights the currently active prayer (Dzuhur)", () => {
    // Setup time so current local time is 12:30 WIB (past Dzuhur 11:45, before Ashar 15:05)
    // 12:30 WIB = 05:30 UTC
    vi.setSystemTime(new Date("2025-06-15T05:30:00Z"));

    vi.mocked(getAdjustedTime).mockReturnValue(new Date("2025-06-15T05:30:00Z"));

    const todayStr = "2025-06-15";
    const mockCountdownSchedule = [
      {
        tanggal: "Ahad, 15/06/2025",
        date: todayStr,
        imsak: "04:15",
        subuh: "04:25",
        terbit: "05:40",
        dhuha: "06:05",
        dzuhur: "11:45",
        ashar: "15:05",
        maghrib: "17:40",
        isya: "18:55",
      },
    ];

    mockUseStore.mockReturnValue({
      ...defaultStoreState,
      countdownSchedule: mockCountdownSchedule,
    });

    render(<TodayCard />);

    // Verify highlighted prayer
    // Dzuhur is index 4 in PRAYER_NAMES ("Dzuhur")
    // Let's find the p tag for Dzuhur and check its parent container class
    const dzuhurLabel = screen.getByText("Dzuhur");
    const container = dzuhurLabel.closest("div");

    expect(container).toHaveClass("animate-pulse-glow");

    // Ensure Ashar is not highlighted
    const asharLabel = screen.getByText("Ashar");
    const asharContainer = asharLabel.closest("div");
    expect(asharContainer).not.toHaveClass("animate-pulse-glow");
  });

  it("updates highlighted prayer when time transitions", () => {
    // Start at 11:40 WIB (Before Dzuhur, Dhuha is active)
    vi.setSystemTime(new Date("2025-06-15T04:40:00Z"));

    vi.mocked(getAdjustedTime).mockReturnValue(new Date("2025-06-15T04:40:00Z"));

    const todayStr = "2025-06-15";
    const mockCountdownSchedule = [
      {
        tanggal: "Ahad, 15/06/2025",
        date: todayStr,
        imsak: "04:15",
        subuh: "04:25",
        terbit: "05:40",
        dhuha: "06:05",
        dzuhur: "11:45",
        ashar: "15:05",
        maghrib: "17:40",
        isya: "18:55",
      },
    ];

    mockUseStore.mockReturnValue({
      ...defaultStoreState,
      countdownSchedule: mockCountdownSchedule,
    });

    render(<TodayCard />);

    // Dhuha should be highlighted
    const dhuhaLabel = screen.getByText("Dhuha");
    expect(dhuhaLabel.closest("div")).toHaveClass("animate-pulse-glow");

    // Fast forward to 11:46 WIB (Dzuhur is now active)
    vi.mocked(getAdjustedTime).mockReturnValue(new Date("2025-06-15T04:46:00Z"));

    act(() => {
      vi.advanceTimersByTime(60000); // Trigger the setInterval(..., 60000)
    });

    // Now Dzuhur should be highlighted
    const dzuhurLabel = screen.getByText("Dzuhur");
    expect(dzuhurLabel.closest("div")).toHaveClass("animate-pulse-glow");

    // Dhuha should no longer be highlighted
    expect(dhuhaLabel.closest("div")).not.toHaveClass("animate-pulse-glow");
  });
});
