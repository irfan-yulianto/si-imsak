import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getSchedule } from "@/lib/api";
import { useStore } from "./useStore";
import {
  BANDUNG,
  DENPASAR,
  JAKARTA,
  JAYAPURA,
  asCity,
  day,
  monthOf,
  resetStore,
  scheduleResponse,
  seedCity,
  seedMonth,
} from "@/__tests__/store";

vi.mock("@/lib/api", () => ({
  getSchedule: vi.fn(),
  reverseGeocodeCity: vi.fn(),
  searchCities: vi.fn(),
}));

type Answer = Awaited<ReturnType<typeof getSchedule>>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const cachedMonth = (location: typeof JAKARTA, days: ReturnType<typeof day>[], ts = Date.now()) =>
  JSON.stringify({
    v: 1,
    ts,
    data: { id: location.cityId, lokasi: location.cityName, daerah: location.province, jadwal: days },
  });

beforeEach(() => {
  resetStore();
  localStorage.clear();
  vi.mocked(getSchedule).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("initial state", () => {
  it("starts on the build date in WIB, not the device clock, so it matches the server HTML", async () => {
    // Built 2026-09-30 20:00 UTC = 1 October in WIB; the device clock is in November
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_BUILD_TIME", "1790798400000");
    vi.useFakeTimers({ now: new Date("2026-11-20T08:00:00Z"), toFake: ["Date"] });
    const { useStore: fresh } = await import("./useStore");
    const state = fresh.getState();
    expect(state).toMatchObject({ viewYear: 2026, viewMonth: 10, locationPrompt: false, months: {} });
    expect(state.location.cityName).toBe("KOTA JAKARTA");
  });
});

describe("hydrateFromCache", () => {
  // Still September in UTC and in Los Angeles, already 1 October in WIB
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-09-30T20:00:00Z"), toFake: ["Date"] });
  });

  it("restores the saved city and its cached month, without a loading state", () => {
    localStorage.setItem("selectedLocation", JSON.stringify(asCity(DENPASAR)));
    localStorage.setItem(`si:schedule:${DENPASAR.cityId}:2026-10`, cachedMonth(DENPASAR, [day("2026-10-01")]));
    // Nothing is read before mount
    expect(useStore.getState().location).toEqual(JAKARTA);

    useStore.getState().hydrateFromCache();

    const state = useStore.getState();
    expect(state.location).toEqual(DENPASAR);
    expect(state).toMatchObject({ viewYear: 2026, viewMonth: 10 });
    expect(monthOf(2026, 10)).toEqual({ days: [day("2026-10-01")], status: "ready", error: null });
  });

  it("decides today in the saved city's time zone", () => {
    // 30 Sep 23:30 WIB is already 1 Oct 01:30 in WIT
    vi.setSystemTime(new Date("2026-09-30T16:30:00Z"));
    localStorage.setItem("selectedLocation", JSON.stringify(asCity(JAYAPURA)));
    useStore.getState().hydrateFromCache();
    expect(useStore.getState()).toMatchObject({ viewYear: 2026, viewMonth: 10 });

    localStorage.setItem("selectedLocation", JSON.stringify(asCity(JAKARTA)));
    useStore.getState().hydrateFromCache();
    expect(useStore.getState()).toMatchObject({ viewYear: 2026, viewMonth: 9 });
  });

  it("ignores an expired cached month", () => {
    localStorage.setItem("selectedLocation", JSON.stringify(asCity(DENPASAR)));
    localStorage.setItem(
      `si:schedule:${DENPASAR.cityId}:2026-10`,
      cachedMonth(DENPASAR, [day("2026-10-01")], Date.now() - 8 * 24 * 3600000)
    );
    useStore.getState().hydrateFromCache();
    expect(useStore.getState().months).toEqual({});
  });

  it("keeps the default city when the saved one is malformed or uses an old numeric id", () => {
    for (const saved of ["not-json{{{", JSON.stringify({ lokasi: "KOTA BALI" }), JSON.stringify({ id: "1301", lokasi: "KOTA LAMA" })]) {
      localStorage.setItem("selectedLocation", saved);
      useStore.getState().hydrateFromCache();
      expect(useStore.getState().location).toEqual(JAKARTA);
    }
  });

  it("restores the light theme and defaults to dark", () => {
    useStore.getState().hydrateFromCache();
    expect(useStore.getState().theme).toBe("dark");
    localStorage.setItem("theme", "light");
    useStore.getState().hydrateFromCache();
    expect(useStore.getState().theme).toBe("light");
  });

  describe("location prompt", () => {
    const DAY = 24 * 3600000;

    it("asks when there is no saved city", () => {
      useStore.getState().hydrateFromCache();
      expect(useStore.getState().locationPrompt).toBe(true);
    });

    it("does not ask when a city is saved", () => {
      localStorage.setItem("selectedLocation", JSON.stringify(asCity(JAKARTA)));
      useStore.getState().hydrateFromCache();
      expect(useStore.getState().locationPrompt).toBe(false);
    });

    it("stays quiet for 7 days after being dismissed, then asks again", () => {
      localStorage.setItem("locationPermissionDismissed", String(Date.now() - 6 * DAY));
      useStore.getState().hydrateFromCache();
      expect(useStore.getState().locationPrompt).toBe(false);

      localStorage.setItem("locationPermissionDismissed", String(Date.now() - 8 * DAY));
      useStore.getState().hydrateFromCache();
      expect(useStore.getState().locationPrompt).toBe(true);
      expect(localStorage.getItem("locationPermissionDismissed")).toBeNull();
    });

    it("asks every visit when storage is unavailable", () => {
      vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
        throw new DOMException("denied", "SecurityError");
      });
      useStore.getState().hydrateFromCache();
      expect(useStore.getState().locationPrompt).toBe(true);
      expect(useStore.getState().location).toEqual(JAKARTA);
    });
  });
});

describe("simple setters", () => {
  it("store the theme (and switch the page's class), offline state, clock offset and GPS position", () => {
    useStore.getState().setTheme("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    useStore.getState().setTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    useStore.getState().setIsOffline(true);
    useStore.getState().setTimeOffset(1500);
    useStore.getState().setUserCoords({ lat: -6.17, lng: 106.85 });
    useStore.getState().setLocationPrompt(true);
    expect(useStore.getState()).toMatchObject({
      theme: "dark",
      isOffline: true,
      timeOffset: 1500,
      userCoords: { lat: -6.17, lng: 106.85 },
      locationPrompt: true,
    });
  });
});

describe("selectCity", () => {
  beforeEach(() => {
    // 30 Sep 23:30 WIB = 1 Oct 01:30 WIT
    vi.useFakeTimers({ now: new Date("2026-09-30T16:30:00Z"), toFake: ["Date"] });
    seedCity(JAKARTA, "2026-09-30");
    seedMonth(2026, 9, [day("2026-09-30")]);
  });

  it("switches city right away and loads the city's current month", async () => {
    const pending = deferred<Answer>();
    vi.mocked(getSchedule).mockReturnValue(pending.promise);

    const result = useStore.getState().selectCity(asCity(JAYAPURA));

    // Already 1 October in Jayapura; nothing of Jakarta's is shown under its name
    expect(useStore.getState()).toMatchObject({ location: JAYAPURA, viewYear: 2026, viewMonth: 10 });
    expect(getSchedule).toHaveBeenCalledWith(JAYAPURA.cityId, 2026, 10);
    expect(monthOf(2026, 10)).toEqual({ days: [], status: "loading", error: null });

    pending.resolve(scheduleResponse(JAYAPURA, [day("2026-10-01")]));
    expect(await result).toEqual({ ok: true });
    expect(monthOf(2026, 10)).toEqual({ days: [day("2026-10-01")], status: "ready", error: null });
  });

  it("takes the time zone from the province in the response", async () => {
    vi.mocked(getSchedule).mockResolvedValue(scheduleResponse(JAYAPURA, [day("2026-10-01")]));
    await useStore.getState().selectCity({ id: JAYAPURA.cityId, lokasi: JAYAPURA.cityName });
    expect(useStore.getState().location).toEqual(JAYAPURA);
  });

  it("keeps the current data on screen while reloading the same city", () => {
    vi.mocked(getSchedule).mockReturnValue(new Promise(() => {}));
    useStore.getState().selectCity(asCity(JAKARTA));
    expect(monthOf(2026, 9)).toEqual({ days: [day("2026-09-30")], status: "loading", error: null });
  });

  it("applies only the newest city when answers arrive out of order", async () => {
    const slowBandung = deferred<Answer>();
    vi.mocked(getSchedule)
      .mockReturnValueOnce(slowBandung.promise)
      .mockResolvedValueOnce(scheduleResponse(JAYAPURA, [day("2026-10-01")]));

    const first = useStore.getState().selectCity(asCity(BANDUNG));
    const second = useStore.getState().selectCity(asCity(JAYAPURA));
    expect(await second).toEqual({ ok: true });

    slowBandung.resolve(scheduleResponse(BANDUNG, [day("2026-09-01")]));
    expect(await first).toEqual({ ok: false, superseded: true });
    expect(useStore.getState().location).toEqual(JAYAPURA);
    // Bandung's late answer only filled Bandung's month
    expect(monthOf(2026, 9, BANDUNG.cityId)?.days).toEqual([day("2026-09-01")]);
    expect(monthOf(2026, 10)?.days).toEqual([day("2026-10-01")]);
  });

  it("ignores a late failure of a city that was replaced", async () => {
    const slowBandung = deferred<Answer>();
    vi.mocked(getSchedule)
      .mockReturnValueOnce(slowBandung.promise)
      .mockResolvedValueOnce(scheduleResponse(JAYAPURA, [day("2026-10-01")]));

    const first = useStore.getState().selectCity(asCity(BANDUNG));
    await useStore.getState().selectCity(asCity(JAYAPURA));
    slowBandung.reject(new Error("timeout"));
    expect(await first).toEqual({ ok: false, superseded: true });
    expect(monthOf(2026, 10)?.status).toBe("ready");
  });

  it("lets month navigation take the table while the city's month still loads", async () => {
    const slowMonth = deferred<Answer>();
    vi.mocked(getSchedule)
      .mockReturnValueOnce(slowMonth.promise)
      .mockResolvedValueOnce(scheduleResponse(BANDUNG, [day("2026-11-01")]));

    const load = useStore.getState().selectCity(asCity(BANDUNG));
    await useStore.getState().showMonth(2026, 11);
    slowMonth.resolve(scheduleResponse(BANDUNG, [day("2026-09-30")]));
    expect(await load).toEqual({ ok: true });

    expect(useStore.getState().viewMonth).toBe(11);
    expect(monthOf(2026, 11)?.days).toEqual([day("2026-11-01")]);
    expect(monthOf(2026, 9)?.days).toEqual([day("2026-09-30")]);
  });

  it("reports missing data and network failures", async () => {
    vi.mocked(getSchedule).mockResolvedValueOnce({ status: false });
    expect(await useStore.getState().selectCity(asCity(BANDUNG))).toEqual({
      ok: false,
      error: "Data tidak tersedia untuk bulan ini.",
    });
    expect(monthOf(2026, 9)).toMatchObject({ status: "error", error: "Data tidak tersedia untuk bulan ini." });

    vi.mocked(getSchedule).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const result = await useStore.getState().selectCity(asCity(BANDUNG));
    expect(result).toEqual({ ok: false, error: "Anda sedang offline. Periksa koneksi internet Anda." });
    expect(monthOf(2026, 9)?.error).toMatch(/offline/);
  });
});

describe("showMonth", () => {
  beforeEach(() => {
    seedCity(JAKARTA, "2026-10-09");
  });

  it("moves the table to the month and loads it", async () => {
    vi.mocked(getSchedule).mockResolvedValue(scheduleResponse(JAKARTA, [day("2025-06-01")]));
    await useStore.getState().showMonth(2025, 6);
    expect(useStore.getState()).toMatchObject({ viewYear: 2025, viewMonth: 6 });
    expect(monthOf(2025, 6)).toEqual({ days: [day("2025-06-01")], status: "ready", error: null });
  });

  it("gives each month its own answer when quick navigation finishes out of order", async () => {
    const slowNovember = deferred<Answer>();
    vi.mocked(getSchedule)
      .mockReturnValueOnce(slowNovember.promise)
      .mockResolvedValueOnce(scheduleResponse(JAKARTA, [day("2026-12-01")]));

    const november = useStore.getState().showMonth(2026, 11);
    await useStore.getState().showMonth(2026, 12);
    slowNovember.resolve(scheduleResponse(JAKARTA, [day("2026-11-01")]));
    await november;

    expect(useStore.getState().viewMonth).toBe(12);
    expect(monthOf(2026, 12)?.days).toEqual([day("2026-12-01")]);
    expect(monthOf(2026, 11)?.days).toEqual([day("2026-11-01")]);
  });

  it("keeps a month's days visible while it reloads, and reports a failure", async () => {
    seedMonth(2026, 10, [day("2026-10-09")]);
    const pending = deferred<Answer>();
    vi.mocked(getSchedule).mockReturnValue(pending.promise);

    const load = useStore.getState().showMonth(2026, 10);
    expect(monthOf(2026, 10)).toEqual({ days: [day("2026-10-09")], status: "loading", error: null });
    pending.reject(new Error("down"));
    await load;
    expect(monthOf(2026, 10)).toEqual({ days: [day("2026-10-09")], status: "error", error: "Gagal memuat jadwal. Coba lagi nanti." });
  });
});

describe("loadCountdownMonths", () => {
  it("loads only the current month on most days", async () => {
    vi.useFakeTimers({ now: new Date("2026-01-15T13:00:00Z"), toFake: ["Date"] });
    vi.mocked(getSchedule).mockResolvedValue(scheduleResponse(JAKARTA, []));
    await useStore.getState().loadCountdownMonths();
    expect(getSchedule).toHaveBeenCalledTimes(1);
    expect(getSchedule).toHaveBeenCalledWith(JAKARTA.cityId, 2026, 1);
  });

  it("also loads next month on a month's last day, also across the year", async () => {
    vi.useFakeTimers({ now: new Date("2026-12-31T13:00:00Z"), toFake: ["Date"] });
    vi.mocked(getSchedule).mockResolvedValue(scheduleResponse(JAKARTA, []));
    await useStore.getState().loadCountdownMonths();
    expect(getSchedule).toHaveBeenCalledWith(JAKARTA.cityId, 2026, 12);
    expect(getSchedule).toHaveBeenCalledWith(JAKARTA.cityId, 2027, 1);
  });

  it("decides the date in the city's time zone", async () => {
    // 30 Jan 23:30 WIB is already 31 Jan 01:30 in WIT: the last day there
    vi.useFakeTimers({ now: new Date("2026-01-30T16:30:00Z"), toFake: ["Date"] });
    useStore.setState({ location: JAYAPURA });
    vi.mocked(getSchedule).mockResolvedValue(scheduleResponse(JAYAPURA, []));
    await useStore.getState().loadCountdownMonths();
    expect(getSchedule).toHaveBeenCalledWith(JAYAPURA.cityId, 2026, 2);
  });

  it("in the background, leaves a failed month alone until a retry succeeds", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-09T03:00:00Z"), toFake: ["Date"] });
    seedCity(JAKARTA, "2026-10-09");
    seedMonth(2026, 10, [], { status: "error", error: "Gagal memuat jadwal. Coba lagi nanti." });

    const pending = deferred<Answer>();
    vi.mocked(getSchedule).mockReturnValueOnce(pending.promise);
    const retry = useStore.getState().loadCountdownMonths({ background: true });
    // No flash of a loading table while the countdown retries
    expect(monthOf(2026, 10)?.status).toBe("error");
    pending.reject(new Error("still down"));
    await retry;
    expect(monthOf(2026, 10)?.status).toBe("error");

    vi.mocked(getSchedule).mockResolvedValueOnce(scheduleResponse(JAKARTA, [day("2026-10-09")]));
    await useStore.getState().loadCountdownMonths({ background: true });
    expect(monthOf(2026, 10)).toEqual({ days: [day("2026-10-09")], status: "ready", error: null });
  });
});

describe("the month cache", () => {
  it("keeps at most 12 months, never the ones on screen", async () => {
    seedCity(JAKARTA, "2026-10-09");
    vi.mocked(getSchedule).mockImplementation(async (_id, year, month) => scheduleResponse(JAKARTA, [day(`${year}-${String(month).padStart(2, "0")}-01`)]));
    await useStore.getState().loadMonth(2026, 10); // today's month, loaded first
    for (let month = 1; month <= 12; month++) {
      if (month !== 10) await useStore.getState().loadMonth(2025, month);
    }
    await useStore.getState().showMonth(2024, 1);

    const ids = Object.keys(useStore.getState().months);
    expect(ids).toHaveLength(12);
    expect(ids).toContain(`${JAKARTA.cityId}:2026-10`);
    expect(ids).toContain(`${JAKARTA.cityId}:2024-01`);
    expect(ids).not.toContain(`${JAKARTA.cityId}:2025-01`);
  });
});
