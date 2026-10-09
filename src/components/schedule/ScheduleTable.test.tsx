import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ScheduleTable from "./ScheduleTable";
import { getSchedule } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { JAKARTA, day, resetStore, seedCity, seedMonth } from "@/__tests__/store";

// Real store; only the network is replaced
vi.mock("@/lib/api", () => ({ getSchedule: vi.fn() }));

const MARCH_12 = day("2024-03-12", { imsak: "04:32", isya: "19:18" });

beforeEach(() => {
  resetStore();
  vi.mocked(getSchedule).mockReset().mockReturnValue(new Promise(() => {}));
  // The city's today: 12 March 2024 (noon WIB), so the table may move from 2023 to 2025
  vi.useFakeTimers({ now: new Date("2024-03-12T05:00:00Z"), toFake: ["Date"] });
  seedCity(JAKARTA, "2024-03-12");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ScheduleTable", () => {
  it("shows skeleton rows while a month loads for the first time", () => {
    const { container } = render(<ScheduleTable />);
    expect(container.querySelectorAll(".animate-shimmer").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("Memuat jadwal...");
  });

  it("shows the month's days, in the table and as cards", () => {
    seedMonth(2024, 3, [MARCH_12]);
    render(<ScheduleTable />);
    expect(screen.getByText("Maret 2024")).toBeInTheDocument();
    expect(screen.getAllByText("04:32")).toHaveLength(2);
    expect(screen.getAllByText("19:18")).toHaveLength(2);
    // Today is marked in both
    expect(document.querySelectorAll('[aria-current="date"]')).toHaveLength(2);
  });

  it("keeps the days on screen while the month reloads", () => {
    seedMonth(2024, 3, [MARCH_12], { status: "loading" });
    render(<ScheduleTable />);
    expect(screen.getAllByText("12:05").length).toBeGreaterThan(0);
  });

  it("asks for a city when a month has no days", () => {
    seedMonth(2024, 3, []);
    render(<ScheduleTable />);
    expect(screen.getByText("Pilih kota untuk melihat jadwal sholat.")).toBeInTheDocument();
  });

  it("shows a failed month's error, and 'Coba Lagi' loads it again", () => {
    seedMonth(2024, 3, [], { status: "error", error: "Gagal memuat jadwal. Coba lagi nanti." });
    render(<ScheduleTable />);
    expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat jadwal. Coba lagi nanti.");

    fireEvent.click(screen.getByRole("button", { name: "Coba lagi memuat jadwal Maret 2024" }));
    expect(getSchedule).toHaveBeenCalledWith(JAKARTA.cityId, 2024, 3);
  });

  it("moves to the previous and next month", () => {
    seedMonth(2024, 3, [MARCH_12]);
    render(<ScheduleTable />);

    fireEvent.click(screen.getByRole("button", { name: "Bulan sebelumnya" }));
    expect(useStore.getState()).toMatchObject({ viewYear: 2024, viewMonth: 2 });
    expect(getSchedule).toHaveBeenLastCalledWith(JAKARTA.cityId, 2024, 2);

    fireEvent.click(screen.getByRole("button", { name: "Bulan berikutnya" }));
    fireEvent.click(screen.getByRole("button", { name: "Bulan berikutnya" }));
    expect(getSchedule).toHaveBeenLastCalledWith(JAKARTA.cityId, 2024, 4);
  });

  it("goes back to the city's current month with 'Hari Ini', whatever the device date", () => {
    // Still 31 March in UTC (and on a device in Los Angeles), already 1 April in Jakarta
    vi.setSystemTime(new Date("2024-03-31T17:30:00Z"));
    useStore.setState({ viewMonth: 2 });
    seedMonth(2024, 2, [day("2024-02-12")]);
    render(<ScheduleTable />);

    fireEvent.click(screen.getByRole("button", { name: "Hari Ini" }));
    expect(useStore.getState().viewMonth).toBe(4);
    expect(getSchedule).toHaveBeenLastCalledWith(JAKARTA.cityId, 2024, 4);
  });

  it("stops at the years the API serves", () => {
    useStore.setState({ viewYear: 2023, viewMonth: 1 });
    seedMonth(2023, 1, [day("2023-01-01")]);
    render(<ScheduleTable />);
    expect(screen.getByRole("button", { name: "Bulan sebelumnya" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bulan berikutnya" })).toBeEnabled();

    act(() => useStore.setState({ viewYear: 2025, viewMonth: 12 }));
    act(() => seedMonth(2025, 12, [day("2025-12-01")]));
    expect(screen.getByRole("button", { name: "Bulan berikutnya" })).toBeDisabled();
  });

  it("never shows another city's month", () => {
    seedMonth(2024, 3, [MARCH_12], { cityId: "ffffffffffffffffffffffffffffffff" });
    render(<ScheduleTable />);
    expect(screen.queryByText("04:32")).not.toBeInTheDocument();
  });
});
