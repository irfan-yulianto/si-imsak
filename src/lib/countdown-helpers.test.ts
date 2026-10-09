import { describe, it, expect } from "vitest";
import { findDay, getNextPrayer, formatCountdown } from "./countdown-helpers";
import { ScheduleDay } from "@/types";

function makeScheduleDay(date: string, times?: Partial<ScheduleDay>): ScheduleDay {
  return {
    tanggal: "",
    date,
    imsak: "04:30",
    subuh: "04:40",
    terbit: "05:50",
    dhuha: "06:15",
    dzuhur: "12:00",
    ashar: "15:15",
    maghrib: "18:05",
    isya: "19:15",
    ...times,
  };
}

const at = (iso: string) => new Date(iso).getTime();

describe("findDay", () => {
  const days = [makeScheduleDay("2026-03-08"), makeScheduleDay("2026-03-09")];

  it("finds a day by its ISO date", () => {
    expect(findDay(days, "2026-03-09")?.date).toBe("2026-03-09");
  });

  it("returns null for a missing day", () => {
    expect(findDay(days, "2026-03-10")).toBeNull();
  });
});

describe("getNextPrayer", () => {
  const days = [makeScheduleDay("2026-03-08"), makeScheduleDay("2026-03-09")];

  it("returns the next of today's times", () => {
    // 2026-03-08 10:00 WIB
    const result = getNextPrayer(days, at("2026-03-08T03:00:00Z"), "WIB");
    expect(result).toMatchObject({ name: "Dzuhur", key: "dzuhur", time: "12:00" });
    expect(result!.isTomorrow).toBeUndefined();
  });

  it("targets the exact instant, to the millisecond", () => {
    // 04:00:00.750 WIB: Imsak at 04:30:00.000 is 29 min 59.25 s away
    const now = at("2026-03-07T21:00:00.750Z");
    const result = getNextPrayer(days, now, "WIB")!;
    expect(result.name).toBe("Imsak");
    expect(result.targetMs).toBe(at("2026-03-07T21:30:00Z"));
    expect(result.remainingMs).toBe(1_799_250);
  });

  it("moves on once a time has arrived", () => {
    // Exactly 04:30 WIB, Imsak itself
    expect(getNextPrayer(days, at("2026-03-07T21:30:00Z"), "WIB")!.name).toBe("Subuh");
  });

  it("counts down to tomorrow's Imsak after Isya", () => {
    // 2026-03-08 20:00 WIB
    const result = getNextPrayer(days, at("2026-03-08T13:00:00Z"), "WIB")!;
    expect(result).toMatchObject({ name: "Imsak", time: "04:30", isTomorrow: true });
    expect(result.targetMs).toBe(at("2026-03-08T21:30:00Z"));
  });

  it("crosses into next month's data on a month's last day", () => {
    const monthEnd = [makeScheduleDay("2026-03-31"), makeScheduleDay("2026-04-01", { imsak: "04:29" })];
    const result = getNextPrayer(monthEnd, at("2026-03-31T13:00:00Z"), "WIB")!;
    expect(result).toMatchObject({ time: "04:29", isTomorrow: true });
  });

  it("returns null when tomorrow's data is missing after Isya", () => {
    expect(getNextPrayer([makeScheduleDay("2026-03-08")], at("2026-03-08T13:00:00Z"), "WIB")).toBeNull();
  });

  it("returns null when today's data is missing", () => {
    expect(getNextPrayer(days, at("2026-03-20T03:00:00Z"), "WIB")).toBeNull();
  });

  it("uses the city's time zone, not the device's", () => {
    // 03:00 UTC is 11:00 WITA and 12:00 WIT: Dzuhur (12:00) is still ahead in WITA only
    expect(getNextPrayer(days, at("2026-03-08T03:00:00Z"), "WITA")!.name).toBe("Dzuhur");
    expect(getNextPrayer(days, at("2026-03-08T03:00:00Z"), "WIT")!.name).toBe("Ashar");
  });

  it("follows the city's date around midnight", () => {
    // 2026-03-08 16:30 UTC is already the 9th in WIT (01:30) but still the 8th in WIB (23:30)
    const now = at("2026-03-08T16:30:00Z");
    expect(getNextPrayer(days, now, "WIT")).toMatchObject({ name: "Imsak", targetMs: at("2026-03-08T19:30:00Z") });
    expect(getNextPrayer(days, now, "WIB")).toMatchObject({ name: "Imsak", isTomorrow: true });
  });
});

describe("formatCountdown", () => {
  it("returns all zeros for 0 or negative", () => {
    expect(formatCountdown(0)).toEqual({ hours: "00", minutes: "00", seconds: "00" });
    expect(formatCountdown(-1000)).toEqual({ hours: "00", minutes: "00", seconds: "00" });
  });

  it("formats 1.5 hours correctly", () => {
    expect(formatCountdown(5400000)).toEqual({ hours: "01", minutes: "30", seconds: "00" });
  });

  it("pads single digits", () => {
    // 5 minutes and 9 seconds = 309000 ms
    expect(formatCountdown(309000)).toEqual({ hours: "00", minutes: "05", seconds: "09" });
  });

  it("handles large values", () => {
    // 12 hours, 34 minutes, 56 seconds
    const ms = (12 * 3600 + 34 * 60 + 56) * 1000;
    expect(formatCountdown(ms)).toEqual({ hours: "12", minutes: "34", seconds: "56" });
  });
});
