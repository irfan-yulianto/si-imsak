import { describe, it, expect } from "vitest";
import { addDays, cityDate, cityInstant, citySecondsOfDay, daysInMonth, formatLongDate, isoDate, monthKey, shiftMonth } from "./city-time";

describe("cityDate", () => {
  // 2026-09-30 20:00 UTC: still 30 Sep in UTC, already 1 Oct in WIB/WITA/WIT
  const instant = Date.UTC(2026, 8, 30, 20, 0);

  it("returns the calendar date in the city's time zone", () => {
    expect(cityDate(instant, "WIB")).toEqual({ year: 2026, month: 10, day: 1, iso: "2026-10-01" });
    expect(cityDate(instant, "WIT").iso).toBe("2026-10-01");
    expect(cityDate(Date.UTC(2026, 8, 30, 16, 30), "WIB").iso).toBe("2026-09-30");
    expect(cityDate(Date.UTC(2026, 8, 30, 16, 30), "WIT").iso).toBe("2026-10-01");
  });

  it("rolls over the year in the city's time zone", () => {
    expect(cityDate(Date.UTC(2026, 11, 31, 17, 0), "WIB")).toMatchObject({ year: 2027, month: 1, day: 1 });
  });

  it("does not depend on the device time zone", () => {
    // Same assertion under every TZ the CI matrix runs (UTC, Jayapura, Los Angeles, Auckland)
    expect(cityDate(instant, "WIB").iso).toBe("2026-10-01");
  });
});

describe("daysInMonth", () => {
  it("handles leap years and month lengths", () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe("citySecondsOfDay", () => {
  it("counts seconds since the city's midnight", () => {
    // 05:30:15 UTC = 12:30:15 WIB, 13:30:15 WITA, 14:30:15 WIT
    const instant = Date.UTC(2026, 2, 8, 5, 30, 15, 900);
    expect(citySecondsOfDay(instant, "WIB")).toBe(12 * 3600 + 30 * 60 + 15);
    expect(citySecondsOfDay(instant, "WITA")).toBe(13 * 3600 + 30 * 60 + 15);
    expect(citySecondsOfDay(instant, "WIT")).toBe(14 * 3600 + 30 * 60 + 15);
  });

  it("wraps at the city's midnight", () => {
    expect(citySecondsOfDay(Date.UTC(2026, 2, 8, 17, 0), "WIB")).toBe(0);
    expect(citySecondsOfDay(Date.UTC(2026, 2, 8, 16, 59, 59), "WIB")).toBe(86_399);
  });
});

describe("cityInstant", () => {
  it("returns the instant a city's clock shows a time", () => {
    // 05:30 WIB is 22:30 UTC the day before
    expect(cityInstant("2026-03-08", "05:30", "WIB")).toBe(Date.UTC(2026, 2, 7, 22, 30));
    expect(cityInstant("2026-03-08", "18:00", "WITA")).toBe(Date.UTC(2026, 2, 8, 10, 0));
    expect(cityInstant("2026-03-08", "04:15", "WIT")).toBe(Date.UTC(2026, 2, 7, 19, 15));
    expect(cityInstant("2026-03-08", "00:00", "WIB")).toBe(Date.UTC(2026, 2, 7, 17, 0));
  });

  it("is the inverse of cityDate and citySecondsOfDay", () => {
    const instant = cityInstant("2026-12-31", "23:59", "WIT");
    expect(cityDate(instant, "WIT").iso).toBe("2026-12-31");
    expect(citySecondsOfDay(instant, "WIT")).toBe(23 * 3600 + 59 * 60);
  });
});

describe("month and day arithmetic", () => {
  it("formats ISO dates and month keys with padding", () => {
    expect(isoDate(2026, 3, 8)).toBe("2026-03-08");
    expect(monthKey(2026, 3)).toBe("2026-03");
    expect(monthKey(2026, 12)).toBe("2026-12");
  });

  it("shifts months across year boundaries", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 6, 0)).toEqual({ year: 2026, month: 6 });
    expect(shiftMonth(2026, 3, -15)).toEqual({ year: 2024, month: 12 });
  });

  it("adds days across month, year and leap-day boundaries", () => {
    expect(addDays("2026-03-31", 1)).toBe("2026-04-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("formatLongDate", () => {
  it("writes the date in Indonesian, as id-ID long dates read", () => {
    expect(formatLongDate("2026-10-09")).toBe("9 Oktober 2026");
    expect(formatLongDate("2027-01-01")).toBe("1 Januari 2027");
    expect(formatLongDate("2026-10-09")).toBe(
      new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
        Date.UTC(2026, 9, 9)
      )
    );
  });
});
