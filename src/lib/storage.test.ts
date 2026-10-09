import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  KEYS,
  evict,
  isAvailable,
  migrateLegacy,
  prepareStorage,
  read,
  readJson,
  readRaw,
  write,
  writeJson,
  writeRaw,
} from "./storage";
import { isLocation, isScheduleData } from "./validate";
import { FakeStorage } from "@/__tests__/fake-storage";

const ID = "58a2fc6ed39fd083f55d4182bf88826d";
const DAY_MS = 24 * 3600000;
const DAY = {
  tanggal: "Minggu, 01/03/2026", date: "2026-03-01", imsak: "04:30", subuh: "04:40", terbit: "05:55",
  dhuha: "06:20", dzuhur: "12:05", ashar: "15:15", maghrib: "18:10", isya: "19:20",
};
const MONTH = { id: ID, lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA", jadwal: [DAY] };
const isNumber = (value: unknown): value is number => typeof value === "number";
const entry = (data: unknown, ts = Date.now()) => JSON.stringify({ v: 1, ts, data });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cached values", () => {
  it("keeps a value with its age and reads it back", () => {
    expect(write(KEYS.schedule(ID, 2026, 3), MONTH)).toBe(true);
    expect(JSON.parse(localStorage.getItem(`si:schedule:${ID}:2026-03`)!)).toMatchObject({ v: 1, data: MONTH });
    expect(read(KEYS.schedule(ID, 2026, 3), isScheduleData, DAY_MS)).toEqual(MONTH);
  });

  it("drops a value once it is older than its maximum age", () => {
    localStorage.setItem("si:x", entry(5, Date.now() - 2 * DAY_MS));
    expect(read("si:x", isNumber, DAY_MS)).toBeNull();
    expect(localStorage.getItem("si:x")).toBeNull();
  });

  it("drops unreadable entries and values of the wrong shape", () => {
    localStorage.setItem("si:a", "{not json");
    localStorage.setItem("si:b", JSON.stringify({ ts: Date.now(), data: 1 })); // no version
    localStorage.setItem("si:c", entry("five"));
    for (const key of ["si:a", "si:b", "si:c"]) {
      expect(read(key, isNumber, DAY_MS)).toBeNull();
      expect(localStorage.getItem(key)).toBeNull();
    }
  });

  it("can keep a value in the session instead", () => {
    write(KEYS.timeOffset, 250, { where: "session" });
    expect(read(KEYS.timeOffset, isNumber, DAY_MS, "session")).toBe(250);
    expect(localStorage.getItem(KEYS.timeOffset)).toBeNull();
  });
});

describe("a full quota", () => {
  let fake: FakeStorage;
  beforeEach(() => {
    fake = new FakeStorage();
    vi.stubGlobal("localStorage", fake);
  });

  it("drops the oldest cache entries and writes again", () => {
    for (let i = 0; i < 4; i++) fake.setItem(`si:old${i}`, entry(i, Date.now() - (10 - i) * 1000));
    fake.setItem("theme", "light");
    fake.failures = 1;

    expect(write("si:new", 1)).toBe(true);
    // A quarter of the four entries: the oldest one
    expect(fake.keys().sort()).toEqual(["si:new", "si:old1", "si:old2", "si:old3", "theme"]);
    expect(read("si:new", isNumber, DAY_MS)).toBe(1);
  });

  it("gives up after one more try", () => {
    fake.setItem("si:old", entry(1, 0));
    fake.failures = 2;
    expect(write("si:new", 1)).toBe(false);
    expect(fake.keys()).toEqual([]);
  });
});

describe("evict", () => {
  it("removes expired and unreadable entries, then the oldest beyond the limit", () => {
    const now = Date.now();
    localStorage.setItem("si:schedule:a", entry(1, now - 1000));
    localStorage.setItem("si:schedule:b", entry(1, now - 2000));
    localStorage.setItem("si:schedule:c", entry(1, now - 3000));
    localStorage.setItem("si:schedule:expired", entry(1, now - 2 * DAY_MS));
    localStorage.setItem("si:schedule:broken", "nope");
    localStorage.setItem("si:mosques:other", entry(1, now - 2 * DAY_MS));

    evict("si:schedule:", { maxAgeMs: DAY_MS, maxEntries: 2 });

    expect(Object.keys(localStorage).sort()).toEqual(["si:mosques:other", "si:schedule:a", "si:schedule:b"]);
  });
});

describe("plain values", () => {
  it("reads and writes strings and checked JSON", () => {
    writeRaw(KEYS.theme, "light");
    expect(readRaw(KEYS.theme)).toBe("light");

    writeJson(KEYS.location, { id: ID, lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" });
    expect(readJson(KEYS.location, isLocation)).toEqual({ id: ID, lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" });
  });

  it("keeps the names earlier versions used, so saved choices carry over", () => {
    expect([KEYS.theme, KEYS.location, KEYS.locationPromptDismissed, KEYS.installDismissed]).toEqual([
      "theme",
      "selectedLocation",
      "locationPermissionDismissed",
      "pwa-install-dismissed",
    ]);
  });

  it("returns null for malformed JSON or a value of the wrong shape", () => {
    localStorage.setItem(KEYS.location, "{oops");
    expect(readJson(KEYS.location, isLocation)).toBeNull();
    localStorage.setItem(KEYS.location, JSON.stringify({ id: "1301", lokasi: "OLD" }));
    expect(readJson(KEYS.location, isLocation)).toBeNull();
  });
});

describe("without storage", () => {
  beforeEach(() => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
  });

  it("acts as if nothing were stored", () => {
    expect(isAvailable()).toBe(false);
    expect(readRaw(KEYS.theme)).toBeNull();
    expect(writeRaw(KEYS.theme, "light")).toBe(false);
    expect(write("si:x", 1)).toBe(false);
    expect(read("si:x", isNumber, DAY_MS)).toBeNull();
    expect(() => prepareStorage()).not.toThrow();
  });
});

describe("migrateLegacy", () => {
  it("moves cached months to the new keys, keeping their age, and drops mosque searches", () => {
    const ts = Date.now() - DAY_MS;
    localStorage.setItem(`schedule_${ID}_2026_3`, JSON.stringify({ _ts: ts, status: true, data: MONTH }));
    const mosques = [{ id: "node/1", name: "Masjid", lat: -6.2, lng: 106.8, distance: 120, type: "masjid" }];
    localStorage.setItem("mosques_-6.20_106.80_r2000", JSON.stringify({ data: mosques, ts }));

    migrateLegacy();

    expect(localStorage.getItem(`schedule_${ID}_2026_3`)).toBeNull();
    expect(JSON.parse(localStorage.getItem(`si:schedule:${ID}:2026-03`)!)).toEqual({ v: 1, ts, data: MONTH });
    // The finder no longer keeps searches on the device
    expect(Object.keys(localStorage)).toEqual([`si:schedule:${ID}:2026-03`]);
  });

  it("drops what can't be moved and the keys nothing reads any more", () => {
    localStorage.setItem(`schedule_${ID}_2026_4`, JSON.stringify({ _ts: Date.now(), data: { jadwal: [{ date: "x" }] } }));
    localStorage.setItem("schedule_1301_2025_1", "{}");
    localStorage.setItem("mosques_-6.20_106.80_r2000", "nope");
    localStorage.setItem("detectedKecamatan", "Menteng");
    sessionStorage.setItem("timeOffset", JSON.stringify({ offset: 1, ts: Date.now() }));
    localStorage.setItem(KEYS.location, JSON.stringify({ id: ID, lokasi: "KOTA JAKARTA" }));

    migrateLegacy();

    expect(Object.keys(localStorage)).toEqual([KEYS.location]);
    expect(sessionStorage.getItem("timeOffset")).toBeNull();
  });

  it("can run again without changing anything", () => {
    localStorage.setItem(`schedule_${ID}_2026_3`, JSON.stringify({ _ts: Date.now(), data: MONTH }));
    migrateLegacy();
    const after = { ...localStorage };
    migrateLegacy();
    expect({ ...localStorage }).toEqual(after);
  });
});

describe("prepareStorage", () => {
  it("migrates, then sweeps out expired caches and the mosque searches of earlier versions", () => {
    vi.useFakeTimers({ now: new Date("2026-03-20T00:00:00Z"), toFake: ["Date"] });
    localStorage.setItem(`schedule_${ID}_2026_3`, JSON.stringify({ _ts: Date.now() - 8 * DAY_MS, data: MONTH }));
    localStorage.setItem("si:mosques:-6.20:106.80:2000", entry([], Date.now() - 3600000));
    localStorage.setItem("si:mosques:-6.21:106.80:2000", entry([], Date.now() - 1000));
    localStorage.setItem(`si:schedule:${ID}:2026-02`, entry(MONTH, Date.now() - DAY_MS));

    prepareStorage();

    expect(Object.keys(localStorage)).toEqual([`si:schedule:${ID}:2026-02`]);
  });
});
