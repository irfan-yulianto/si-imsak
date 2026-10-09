import { render, screen, act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import TodayCard from "./TodayCard";
import { getHijriDate } from "@/lib/hijri";
import { DENPASAR, JAKARTA, day, resetStore, seedCity, seedMonth } from "@/__tests__/store";

// Real store, real dates: only the clock is faked
const JUNE_15 = day("2025-06-15", {
  imsak: "04:15", subuh: "04:25", terbit: "05:40", dhuha: "06:05",
  dzuhur: "11:45", ashar: "15:05", maghrib: "17:40", isya: "18:55",
});

/** The time tile of a prayer, found by its name */
const tile = (name: string) => screen.getByText(name).closest("div");

beforeEach(() => {
  resetStore();
  // 15 June 2025, 12:00 WIB
  vi.useFakeTimers({ now: new Date("2025-06-15T05:00:00Z") });
  seedCity(JAKARTA, "2025-06-15");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TodayCard", () => {
  it("shows a skeleton while this month loads", () => {
    seedMonth(2025, 6, [], { status: "loading" });
    render(<TodayCard />);
    expect(screen.getByRole("status", { name: "Memuat jadwal hari ini" })).toBeInTheDocument();
  });

  it("says so when today's schedule isn't available", () => {
    seedMonth(2025, 6, [], { status: "error", error: "Gagal memuat jadwal. Coba lagi nanti." });
    render(<TodayCard />);
    expect(screen.getByText("Jadwal hari ini belum tersedia.")).toBeInTheDocument();
  });

  it("shows today's date, Hijri date and all eight times", () => {
    seedMonth(2025, 6, [JUNE_15]);
    render(<TodayCard />);

    expect(screen.getByText("Minggu, 15 Juni 2025")).toBeInTheDocument();
    expect(screen.getByText(getHijriDate("2025-06-15"))).toBeInTheDocument();
    for (const time of ["04:15", "04:25", "05:40", "06:05", "11:45", "15:05", "17:40", "18:55"]) {
      expect(screen.getByText(time)).toBeInTheDocument();
    }
  });

  it("follows the city's calendar, not the UTC date", () => {
    // 17:30 UTC on the 15th is already 00:30 on the 16th in Jakarta
    vi.setSystemTime(new Date("2025-06-15T17:30:00Z"));
    seedMonth(2025, 6, [JUNE_15, day("2025-06-16", { dzuhur: "11:46" })]);
    render(<TodayCard />);
    expect(screen.getByText(/16 Juni 2025/)).toBeInTheDocument();
    expect(screen.getByText("11:46")).toBeInTheDocument();
  });

  it("moves to the next day at the city's midnight", () => {
    vi.setSystemTime(new Date("2025-06-15T16:59:30Z")); // 23:59:30 WIB
    seedMonth(2025, 6, [JUNE_15, day("2025-06-16", { dzuhur: "11:46" })]);
    render(<TodayCard />);
    expect(screen.getByText(/15 Juni 2025/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(screen.getByText(/16 Juni 2025/)).toBeInTheDocument();
  });

  it("renders the same skeleton on the server whatever the clock says, so hydration matches", () => {
    // The server has no saved city, cache or clock: the client fills the card in after hydrating
    seedMonth(2025, 6, [JUNE_15]);
    const html = renderToString(<TodayCard />);
    expect(html).toContain('aria-label="Memuat jadwal hari ini"');
    expect(html).not.toContain("aria-current");

    vi.setSystemTime(new Date("2025-07-01T05:00:00Z"));
    expect(renderToString(<TodayCard />)).toBe(html);
  });

  it("highlights the time in progress and marks earlier ones as past", () => {
    // 12:30 WIB: after Dzuhur (11:45), before Ashar (15:05)
    vi.setSystemTime(new Date("2025-06-15T05:30:00Z"));
    seedMonth(2025, 6, [JUNE_15]);
    render(<TodayCard />);

    expect(tile("Dzuhur")).toHaveAttribute("aria-current", "time");
    expect(tile("Dzuhur")).toHaveTextContent("(sedang berlangsung)");
    expect(tile("Subuh")).toHaveTextContent("(sudah lewat)");
    expect(tile("Ashar")).not.toHaveAttribute("aria-current");
  });

  it("moves the highlight at the minute a time arrives", () => {
    // 11:40 WIB: Dhuha in progress
    vi.setSystemTime(new Date("2025-06-15T04:40:00Z"));
    seedMonth(2025, 6, [JUNE_15]);
    render(<TodayCard />);
    expect(tile("Dhuha")).toHaveAttribute("aria-current", "time");

    act(() => {
      vi.advanceTimersByTime(4 * 60_000);
    });
    expect(tile("Dhuha")).toHaveAttribute("aria-current", "time");

    act(() => {
      vi.advanceTimersByTime(60_100); // just after 11:45, when the minute's check runs
    });
    expect(tile("Dzuhur")).toHaveAttribute("aria-current", "time");
    expect(tile("Dhuha")).not.toHaveAttribute("aria-current");
  });

  it("reads the clock in the city's time zone", () => {
    // 04:30 UTC is 11:30 WIB but 12:30 WITA: Dzuhur has begun in Denpasar only
    vi.setSystemTime(new Date("2025-06-15T04:30:00Z"));
    seedCity(DENPASAR, "2025-06-15");
    seedMonth(2025, 6, [JUNE_15]);
    render(<TodayCard />);
    expect(tile("Dzuhur")).toHaveAttribute("aria-current", "time");
  });
});
