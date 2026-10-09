import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Home from "./page";
import { FakeStorage } from "@/__tests__/fake-storage";
import { BANDUNG, asCity, monthDays, resetStore, scheduleResponse } from "@/__tests__/store";

// The whole page with its real components, store and start-up; only the network and
// the date are fake

class NoIntersectionObserver {
  observe() {}
  disconnect() {}
}

const requested: string[] = [];

beforeEach(() => {
  resetStore();
  requested.length = 0;
  // 15 March 2026, 10:00 WIB
  vi.useFakeTimers({ now: new Date("2026-03-15T03:00:00Z"), toFake: ["Date"] });
  const storage = new FakeStorage();
  storage.setItem("selectedLocation", JSON.stringify(asCity(BANDUNG)));
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("IntersectionObserver", NoIntersectionObserver);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      requested.push(input);
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/schedule" && url.searchParams.get("city_id") === BANDUNG.cityId) {
        const year = Number(url.searchParams.get("year"));
        const month = Number(url.searchParams.get("month"));
        return new Response(JSON.stringify(scheduleResponse(BANDUNG, monthDays(year, month, { dzuhur: "11:58" }))));
      }
      return new Response("", { status: 503 });
    })
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Home", () => {
  it("starts with the saved city and shows its month in the countdown, today's card and the table", async () => {
    render(<Home />);

    const countdown = screen.getByRole("region", { name: "Hitung mundur waktu sholat" });
    expect(await within(countdown).findByText("Menuju Waktu Dzuhur")).toBeInTheDocument();
    expect(within(countdown).getByText("11:58 WIB")).toBeInTheDocument();
    expect(within(countdown).getByText("KOTA BANDUNG")).toBeInTheDocument();

    expect(screen.getByText("Minggu, 15 Maret 2026")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: /^Jadwal imsakiyah Maret 2026, KOTA BANDUNG/ });
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 31);
    expect(table.querySelector('[aria-current="date"]')).toHaveTextContent("Min 15");

    // One request for the city's month, from the start-up
    expect(requested.filter((url) => url.startsWith("/api/schedule"))).toEqual([
      `/api/schedule?city_id=${BANDUNG.cityId}&year=2026&month=3`,
    ]);
  });
});
