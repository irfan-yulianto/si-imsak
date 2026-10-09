import { describe, it, expect } from "vitest";
import {
  isCityId,
  isHHMM,
  isIsoDate,
  isLocation,
  isScheduleDay,
  parseCityList,
  parseMosques,
  parseScheduleResponse,
  parseServerTime,
  parseUpstreamPeriod,
  toScheduleDay,
} from "./validate";

const ID = "58a2fc6ed39fd083f55d4182bf88826d";
const TIMES = {
  imsak: "04:30", subuh: "04:40", terbit: "05:55", dhuha: "06:20",
  dzuhur: "12:05", ashar: "15:15", maghrib: "18:10", isya: "19:20",
};
const DAY = { tanggal: "Minggu, 01/03/2026", date: "2026-03-01", ...TIMES };

describe("primitive guards", () => {
  it("accepts HH:MM between 00:00 and 23:59 only", () => {
    expect(["00:00", "04:30", "23:59"].every(isHHMM)).toBe(true);
    expect(["24:00", "4:30", "04:60", "04.30", "", null, 430].some(isHHMM)).toBe(false);
  });

  it("accepts ISO dates with real month and day numbers", () => {
    expect(isIsoDate("2026-03-01")).toBe(true);
    expect(["2026-13-01", "2026-00-10", "2026-03-32", "01/03/2026", "2026-3-1", undefined].some(isIsoDate)).toBe(false);
  });

  it("accepts MyQuran v3 city ids (MD5), not old numeric ones", () => {
    expect(isCityId(ID)).toBe(true);
    expect(["1301", ID.toUpperCase(), `${ID}0`, "", 1301].some(isCityId)).toBe(false);
  });
});

describe("isScheduleDay", () => {
  it("accepts a complete day", () => {
    expect(isScheduleDay(DAY)).toBe(true);
  });

  it.each([
    ["a missing time", { ...DAY, isya: undefined }],
    ["a malformed time", { ...DAY, maghrib: "6:10 PM" }],
    ["a missing label", { ...DAY, tanggal: "" }],
    ["a malformed date", { ...DAY, date: "01-03-2026" }],
    ["an array", [DAY]],
    ["null", null],
  ])("rejects %s", (_, value) => {
    expect(isScheduleDay(value)).toBe(false);
  });
});

describe("isLocation", () => {
  it("accepts a saved city, with or without its province", () => {
    expect(isLocation({ id: ID, lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" })).toBe(true);
    expect(isLocation({ id: ID, lokasi: "KOTA JAKARTA" })).toBe(true);
  });

  it("rejects old numeric ids, missing names and wrong types", () => {
    expect(isLocation({ id: "1301", lokasi: "KOTA JAKARTA" })).toBe(false);
    expect(isLocation({ id: ID, lokasi: "" })).toBe(false);
    expect(isLocation({ id: ID, lokasi: "KOTA JAKARTA", daerah: 7 })).toBe(false);
    expect(isLocation("KOTA JAKARTA")).toBe(false);
  });
});

describe("toScheduleDay", () => {
  it("adds the ISO date to a complete upstream day", () => {
    expect(toScheduleDay("2026-03-01", { tanggal: DAY.tanggal, ...TIMES, extra: 1 })).toEqual(DAY);
  });

  it("rejects a day with any time that isn't HH:MM", () => {
    expect(toScheduleDay("2026-03-01", { tanggal: DAY.tanggal, ...TIMES, dzuhur: "-" })).toBeNull();
    expect(toScheduleDay("2026-03-01", "nope")).toBeNull();
  });
});

describe("parseUpstreamPeriod", () => {
  it("returns the schedule object and the names", () => {
    const body = { status: true, data: { kabko: "KOTA JAKARTA", prov: "DKI JAKARTA", jadwal: { "2026-03-01": {} } } };
    expect(parseUpstreamPeriod(body)).toEqual({ kabko: "KOTA JAKARTA", prov: "DKI JAKARTA", jadwal: { "2026-03-01": {} } });
  });

  it("returns null without a schedule", () => {
    expect(parseUpstreamPeriod({ status: false, message: "Lokasi tidak ditemukan" })).toBeNull();
    expect(parseUpstreamPeriod({ status: true, data: { jadwal: [] } })).toBeNull();
    expect(parseUpstreamPeriod("<html>")).toBeNull();
  });

  it("drops names that aren't strings", () => {
    expect(parseUpstreamPeriod({ status: true, data: { kabko: 1, jadwal: {} } })).toEqual({ jadwal: {} });
  });
});

describe("parseScheduleResponse", () => {
  const body = { status: true, data: { id: ID, lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA", jadwal: [DAY] } };

  it("accepts our own answer, keeping the partial flag", () => {
    expect(parseScheduleResponse(body)).toEqual(body);
    expect(parseScheduleResponse({ ...body, partial: true })).toEqual({ ...body, partial: true });
  });

  it("passes failures through", () => {
    expect(parseScheduleResponse({ status: false, error: "Schedule not found" })).toEqual({
      status: false,
      error: "Schedule not found",
    });
  });

  it("rejects an answer with a malformed day or no days", () => {
    expect(parseScheduleResponse({ ...body, data: { ...body.data, jadwal: [{ ...DAY, imsak: "" }] } })).toBeNull();
    expect(parseScheduleResponse({ status: true, data: {} })).toBeNull();
    expect(parseScheduleResponse({ status: "yes" })).toBeNull();
    expect(parseScheduleResponse(null)).toBeNull();
  });
});

describe("parseCityList", () => {
  it("keeps only well-formed cities and only their fields", () => {
    const body = {
      status: true,
      data: [
        { id: ID, lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA", extra: "x" },
        { id: ID, lokasi: "KAB. TANPA PROVINSI" },
        { id: "1301", lokasi: "OLD" },
        { lokasi: "NO ID" },
        "KOTA BANDUNG",
      ],
    };
    expect(parseCityList(body)).toEqual([
      { id: ID, lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" },
      { id: ID, lokasi: "KAB. TANPA PROVINSI", daerah: "" },
    ]);
  });

  it("returns an empty list for anything else", () => {
    expect(parseCityList({ status: true, data: "none" })).toEqual([]);
    expect(parseCityList(undefined)).toEqual([]);
  });
});

describe("parseMosques", () => {
  const mosque = { id: "node/1", name: "Masjid Istiqlal", lat: -6.17, lng: 106.83, distance: 120, type: "masjid" };

  it("keeps the well-formed mosques of a successful answer", () => {
    expect(parseMosques({ status: true, data: [mosque, { ...mosque, lat: "x" }, { ...mosque, type: "church" }] })).toEqual([
      mosque,
    ]);
  });

  it("returns null for a failed or malformed answer", () => {
    expect(parseMosques({ status: false, error: "Upstream mosque service unavailable" })).toBeNull();
    expect(parseMosques({ status: true })).toBeNull();
  });
});

describe("parseServerTime", () => {
  it("returns the server clock or null", () => {
    expect(parseServerTime({ now: 1_791_000_000_000 })).toBe(1_791_000_000_000);
    expect(parseServerTime({ now: "1791000000000" })).toBeNull();
    expect(parseServerTime({ now: Number.NaN })).toBeNull();
    expect(parseServerTime([])).toBeNull();
  });
});
