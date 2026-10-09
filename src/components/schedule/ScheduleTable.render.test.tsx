import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ScheduleTable from "./ScheduleTable";
import type { TableDay } from "./schedule-days";
import { JAKARTA, monthDays, resetStore, seedCity, seedMonth } from "@/__tests__/store";

vi.mock("@/lib/api", () => ({ getSchedule: vi.fn(() => new Promise(() => {})) }));

// Every table row and card reads its day's dateNum once when it renders: counting the
// reads per day counts the renders
const renders = vi.hoisted(() => new Map<string, number>());
vi.mock("./schedule-days", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./schedule-days")>();
  const counted = (day: TableDay) =>
    new Proxy(day, {
      get(target, prop, receiver) {
        if (prop === "dateNum") renders.set(target.date, (renders.get(target.date) ?? 0) + 1);
        return Reflect.get(target, prop, receiver);
      },
    });
  return { ...actual, toTableDays: (days: Parameters<typeof actual.toTableDays>[0]) => actual.toTableDays(days).map(counted) };
});

/** Tells the "Hari Ini" button whether today's card is in view */
let reportCardVisible: (visible: boolean) => void = () => {};

class FakeIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {
    reportCardVisible = (visible) =>
      this.callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  disconnect() {}
}

const totalRenders = () => [...renders.values()].reduce((sum, n) => sum + n, 0);

beforeEach(() => {
  resetStore();
  renders.clear();
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  // 12 March 2024, 23:59:30 WIB
  vi.useFakeTimers({ now: new Date("2024-03-12T16:59:30Z") });
  seedCity(JAKARTA, "2024-03-12");
  seedMonth(2024, 3, monthDays(2024, 3));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ScheduleTable renders", () => {
  it("leaves the month alone while today's card scrolls out of view and back", () => {
    render(<ScheduleTable />);
    // Each day once as a table row and once as a card
    expect(renders.get("2024-03-01")).toBe(2);
    const before = totalRenders();

    act(() => reportCardVisible(false));
    expect(screen.getByRole("button", { name: "Gulir ke jadwal hari ini" })).toBeInTheDocument();
    act(() => reportCardVisible(true));
    expect(screen.queryByRole("button", { name: "Gulir ke jadwal hari ini" })).not.toBeInTheDocument();

    expect(totalRenders()).toBe(before);
  });

  it("renders only yesterday and today again at midnight", () => {
    render(<ScheduleTable />);
    renders.clear();

    act(() => {
      vi.advanceTimersByTime(30_100);
    });
    expect(Object.fromEntries(renders)).toEqual({ "2024-03-12": 2, "2024-03-13": 2 });
    expect(document.querySelectorAll('[aria-current="date"]')[0]).toHaveTextContent("Rab, 13");
  });
});
