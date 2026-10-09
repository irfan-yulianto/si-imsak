import { describe, it, expect } from "vitest";
import { cityDate, daysInMonth } from "./city-time";

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
