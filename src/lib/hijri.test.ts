import { describe, it, expect, vi, afterEach } from "vitest";
import { getHijriParts, getHijriDate, getHijriMonthsForGregorianMonth } from "./hijri";

describe("time zone independence", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it.each(["Asia/Jakarta", "Pacific/Auckland", "Pacific/Kiritimati", "America/Los_Angeles"])(
    "gives the same Hijri date on a device in %s",
    async (tz) => {
      process.env.TZ = tz;
      vi.resetModules();
      const hijri = await import("./hijri");
      // 18 February 2026 is 1 Ramadan 1447 (Umm al-Qura)
      expect(hijri.getHijriParts("2026-02-18")).toEqual({ day: 1, month: 9, monthName: "Ramadan", year: 1447 });
    }
  );
});

describe("getHijriParts", () => {
  it("returns valid parts for a known date", () => {
    const parts = getHijriParts("2026-03-01");
    expect(parts.day).toBeGreaterThan(0);
    expect(parts.month).toBeGreaterThanOrEqual(1);
    expect(parts.month).toBeLessThanOrEqual(12);
    expect(parts.year).toBeGreaterThan(1400);
    expect(parts.monthName).toBeTruthy();
  });

  it("returns zeroed parts for invalid date", () => {
    const parts = getHijriParts("invalid-date");
    expect(parts.day).toBe(0);
    expect(parts.month).toBe(0);
    expect(parts.monthName).toBe("");
    expect(parts.year).toBe(0);
  });

  it("caches results (same input returns consistent result)", () => {
    const a = getHijriParts("2026-01-15");
    const b = getHijriParts("2026-01-15");
    expect(a).toEqual(b);
  });

  it("returns month name from HIJRI_MONTH_NAMES", () => {
    const validNames = [
      "Muharram", "Safar", "Rabi'ul Awwal", "Rabi'ul Akhir",
      "Jumadil Awwal", "Jumadil Akhir", "Rajab", "Sya'ban",
      "Ramadan", "Syawal", "Dzulqa'dah", "Dzulhijjah",
    ];
    const parts = getHijriParts("2026-06-15");
    expect(validNames).toContain(parts.monthName);
  });
});

describe("getHijriDate", () => {
  it("returns formatted string with H suffix", () => {
    const result = getHijriDate("2026-03-01");
    expect(result).toMatch(/^\d+ \w.+ \d+H$/);
  });

  it("returns zeroed string for invalid date", () => {
    const result = getHijriDate("bad-date");
    expect(result).toBe("0  0H");
  });
});

describe("getHijriMonthsForGregorianMonth", () => {
  it("returns at least one entry", () => {
    const result = getHijriMonthsForGregorianMonth(2026, 3);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("each entry has monthName and year", () => {
    const result = getHijriMonthsForGregorianMonth(2026, 3);
    for (const entry of result) {
      expect(entry.monthName).toBeTruthy();
      expect(entry.year).toBeGreaterThan(1400);
    }
  });

  it("handles January", () => {
    const result = getHijriMonthsForGregorianMonth(2026, 1);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("handles December", () => {
    const result = getHijriMonthsForGregorianMonth(2026, 12);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("can span two Hijri months", () => {
    // Most Gregorian months span two Hijri months
    // Test several months to find one that spans
    let foundSpan = false;
    for (let m = 1; m <= 12; m++) {
      const result = getHijriMonthsForGregorianMonth(2026, m);
      if (result.length === 2) {
        foundSpan = true;
        expect(result[0].monthName).not.toBe(result[1].monthName);
        break;
      }
    }
    expect(foundSpan).toBe(true);
  });
});
