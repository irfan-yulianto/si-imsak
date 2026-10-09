import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing store
vi.mock("@/lib/api", () => ({
  getSchedule: vi.fn(),
}));

vi.mock("@/lib/timezone", () => ({
  getTimezone: vi.fn((d: string) => {
    if (d.includes("BALI")) return "WITA";
    if (d.includes("PAPUA")) return "WIT";
    return "WIB";
  }),
}));

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("useStore", () => {
  it("initializes with default Jakarta location when no cache", async () => {
    const { useStore } = await import("./useStore");
    const state = useStore.getState();
    expect(state.location.cityId).toBe("58a2fc6ed39fd083f55d4182bf88826d");
    expect(state.location.cityName).toBe("KOTA JAKARTA");
  });

  it("hydrates location from localStorage cache", async () => {
    localStorage.setItem(
      "selectedLocation",
      JSON.stringify({ id: "test-id", lokasi: "KOTA BALI", daerah: "BALI" })
    );
    const { useStore } = await import("./useStore");
    // Nothing is read from localStorage until after mount (keeps hydration in sync)
    expect(useStore.getState().location.cityName).toBe("KOTA JAKARTA");
    useStore.getState().hydrateFromCache();
    const state = useStore.getState();
    expect(state.location.cityId).toBe("test-id");
    expect(state.location.cityName).toBe("KOTA BALI");
    expect(state.location.timezone).toBe("WITA");
  });

  it("returns default location when cached data is invalid JSON", async () => {
    localStorage.setItem("selectedLocation", "not-json{{{");
    const { useStore } = await import("./useStore");
    useStore.getState().hydrateFromCache();
    const state = useStore.getState();
    expect(state.location.cityName).toBe("KOTA JAKARTA");
  });

  it("returns default location when cached data lacks id", async () => {
    localStorage.setItem(
      "selectedLocation",
      JSON.stringify({ lokasi: "KOTA BALI", daerah: "BALI" })
    );
    const { useStore } = await import("./useStore");
    useStore.getState().hydrateFromCache();
    const state = useStore.getState();
    expect(state.location.cityName).toBe("KOTA JAKARTA");
  });

  it("setLocation updates location state", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().setLocation(
      { id: "new-id", lokasi: "KOTA SURABAYA", daerah: "JAWA TIMUR" },
      "WIB"
    );
    expect(useStore.getState().location.cityId).toBe("new-id");
    expect(useStore.getState().location.cityName).toBe("KOTA SURABAYA");
  });

  it("setSchedule sets data and clears loading/error", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().setScheduleLoading(true);
    useStore.getState().setSchedule([{ date: "2026-03-01" } as never]);
    const schedule = useStore.getState().schedule;
    expect(schedule.data).toHaveLength(1);
    expect(schedule.loading).toBe(false);
    expect(schedule.error).toBeNull();
  });

  it("setScheduleLoading sets loading flag", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().setScheduleLoading(true);
    expect(useStore.getState().schedule.loading).toBe(true);
  });

  it("setScheduleError sets error and clears loading", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().setScheduleLoading(true);
    useStore.getState().setScheduleError("Something went wrong");
    const schedule = useStore.getState().schedule;
    expect(schedule.error).toBe("Something went wrong");
    expect(schedule.loading).toBe(false);
  });

  it("setViewMonth updates viewMonth and viewYear", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().setViewMonth(6, 2025);
    expect(useStore.getState().viewMonth).toBe(6);
    expect(useStore.getState().viewYear).toBe(2025);
  });

  it("setTimeOffset updates timeOffset", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().setTimeOffset(1500);
    expect(useStore.getState().timeOffset).toBe(1500);
  });

  it("setTheme stores to localStorage and toggles dark class", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().setTheme("light");
    expect(useStore.getState().theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    useStore.getState().setTheme("dark");
    expect(useStore.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("setCountdownSchedule updates countdownSchedule", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().setCountdownSchedule([{ date: "2026-03-01" } as never]);
    expect(useStore.getState().countdownSchedule).toHaveLength(1);
  });

  it("setIsOffline updates isOffline", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().setIsOffline(true);
    expect(useStore.getState().isOffline).toBe(true);
  });

  it("setUserCoords updates userCoords", async () => {
    const { useStore } = await import("./useStore");
    useStore.getState().setUserCoords({ lat: -6.17, lng: 106.85 });
    expect(useStore.getState().userCoords).toEqual({ lat: -6.17, lng: 106.85 });
  });

  describe("fetchScheduleForMonth", () => {
    it("sets loading and updates view month/year", async () => {
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockResolvedValue({
        status: true,
        data: { id: "x", lokasi: "X", daerah: "X", jadwal: [] },
      });

      const { useStore } = await import("./useStore");
      await useStore.getState().fetchScheduleForMonth(2025, 6);
      expect(useStore.getState().viewMonth).toBe(6);
      expect(useStore.getState().viewYear).toBe(2025);
    });

    it("sets schedule data on success", async () => {
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockResolvedValue({
        status: true,
        data: { id: "x", lokasi: "X", daerah: "X", jadwal: [{ date: "2025-06-01" } as never] },
      });

      const { useStore } = await import("./useStore");
      await useStore.getState().fetchScheduleForMonth(2025, 6);
      expect(useStore.getState().schedule.data).toHaveLength(1);
      expect(useStore.getState().schedule.loading).toBe(false);
    });

    it("sets error on failure", async () => {
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockRejectedValue(new Error("fail"));

      const { useStore } = await import("./useStore");
      await useStore.getState().fetchScheduleForMonth(2025, 6);
      expect(useStore.getState().schedule.error).toBeTruthy();
      expect(useStore.getState().schedule.loading).toBe(false);
    });
  });

  describe("refetchSchedule", () => {
    it("updates countdownSchedule on success", async () => {
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockResolvedValue({
        status: true,
        data: { id: "x", lokasi: "X", daerah: "X", jadwal: [{ date: "2026-03-01" } as never] },
      });

      const { useStore } = await import("./useStore");
      await useStore.getState().refetchSchedule();
      expect(useStore.getState().countdownSchedule).toHaveLength(1);
    });

    it("silently fails on error", async () => {
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockRejectedValue(new Error("fail"));

      const { useStore } = await import("./useStore");
      const before = useStore.getState().countdownSchedule;
      await useStore.getState().refetchSchedule();
      expect(useStore.getState().countdownSchedule).toEqual(before);
    });
  });

  describe("initial state", () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    });

    it("starts on the build date in WIB, not the device clock, so it matches the server HTML", async () => {
      // Built 2026-09-30 20:00 UTC = 1 October in WIB; the device clock is in November
      vi.stubEnv("NEXT_PUBLIC_BUILD_TIME", "1790798400000");
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-20T08:00:00Z"));
      const { useStore } = await import("./useStore");
      const state = useStore.getState();
      expect(state.viewYear).toBe(2026);
      expect(state.viewMonth).toBe(10);
      expect(state.todayDateStr).toBe("");
      expect(state.locationPrompt).toBe(false);
    });
  });

  describe("hydrateFromCache", () => {
    // Still September in UTC and in Los Angeles, already 1 October in WIB
    const MONTH_EDGE = new Date("2026-09-30T20:00:00Z");

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(MONTH_EDGE);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("loads the cached schedule for the city's current month without a loading state", async () => {
      localStorage.setItem("selectedLocation", JSON.stringify({ id: "bali", lokasi: "KOTA DENPASAR", daerah: "BALI" }));
      localStorage.setItem(
        "schedule_bali_2026_10",
        JSON.stringify({ _ts: Date.now(), status: true, data: { jadwal: [{ date: "x" }] } })
      );
      const { useStore } = await import("./useStore");
      expect(useStore.getState().schedule.loading).toBe(true);

      useStore.getState().hydrateFromCache();
      const state = useStore.getState();
      expect(state.schedule).toEqual({ data: [{ date: "x" }], loading: false, error: null });
      expect(state.countdownSchedule).toHaveLength(1);
      expect(state.viewMonth).toBe(10);
      expect(state.viewYear).toBe(2026);
      expect(state.todayDateStr).toBe("2026-10-01");
    });

    it("decides today in the saved city's time zone", async () => {
      // 30 Sep 23:30 WIB is already 1 Oct 01:30 in WIT
      vi.setSystemTime(new Date("2026-09-30T16:30:00Z"));
      localStorage.setItem("selectedLocation", JSON.stringify({ id: "papua", lokasi: "KOTA JAYAPURA", daerah: "PAPUA" }));
      const { useStore } = await import("./useStore");
      useStore.getState().hydrateFromCache();
      expect(useStore.getState().todayDateStr).toBe("2026-10-01");

      localStorage.setItem("selectedLocation", JSON.stringify({ id: "jkt", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" }));
      useStore.getState().hydrateFromCache();
      expect(useStore.getState().todayDateStr).toBe("2026-09-30");
      expect(useStore.getState().viewMonth).toBe(9);
    });

    it("ignores an expired cached schedule", async () => {
      localStorage.setItem("selectedLocation", JSON.stringify({ id: "bali", lokasi: "KOTA DENPASAR", daerah: "BALI" }));
      localStorage.setItem(
        "schedule_bali_2026_10",
        JSON.stringify({ _ts: Date.now() - 8 * 24 * 3600000, status: true, data: { jadwal: [{ date: "x" }] } })
      );
      const { useStore } = await import("./useStore");
      useStore.getState().hydrateFromCache();
      expect(useStore.getState().schedule.data).toEqual([]);
    });

    it("ignores legacy numeric city ids", async () => {
      localStorage.setItem("selectedLocation", JSON.stringify({ id: "1301", lokasi: "KOTA LAMA", daerah: "BALI" }));
      const { useStore } = await import("./useStore");
      useStore.getState().hydrateFromCache();
      expect(useStore.getState().location.cityName).toBe("KOTA JAKARTA");
    });

    it("restores the light theme and defaults to dark", async () => {
      const { useStore } = await import("./useStore");
      expect(useStore.getState().theme).toBe("dark");
      useStore.getState().hydrateFromCache();
      expect(useStore.getState().theme).toBe("dark");

      localStorage.setItem("theme", "light");
      useStore.getState().hydrateFromCache();
      expect(useStore.getState().theme).toBe("light");
    });

    describe("location prompt", () => {
      const DAY = 24 * 3600000;

      it("asks when there is no saved city", async () => {
        const { useStore } = await import("./useStore");
        useStore.getState().hydrateFromCache();
        expect(useStore.getState().locationPrompt).toBe(true);
      });

      it("does not ask when a city is saved", async () => {
        localStorage.setItem("selectedLocation", JSON.stringify({ id: "jkt", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" }));
        const { useStore } = await import("./useStore");
        useStore.getState().hydrateFromCache();
        expect(useStore.getState().locationPrompt).toBe(false);
      });

      it("stays quiet for 7 days after being dismissed, then asks again", async () => {
        localStorage.setItem("locationPermissionDismissed", String(Date.now() - 6 * DAY));
        const { useStore } = await import("./useStore");
        useStore.getState().hydrateFromCache();
        expect(useStore.getState().locationPrompt).toBe(false);

        localStorage.setItem("locationPermissionDismissed", String(Date.now() - 8 * DAY));
        useStore.getState().hydrateFromCache();
        expect(useStore.getState().locationPrompt).toBe(true);
        expect(localStorage.getItem("locationPermissionDismissed")).toBeNull();
      });

      it("asks every visit when storage is unavailable", async () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
          throw new Error("SecurityError");
        });
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const { useStore } = await import("./useStore");
        useStore.getState().hydrateFromCache();
        expect(useStore.getState().locationPrompt).toBe(true);
        expect(useStore.getState().location.cityName).toBe("KOTA JAKARTA");
      });
    });
  });

  describe("loadCitySchedule", () => {
    const BANDUNG = { id: "bdg", lokasi: "KOTA BANDUNG", daerah: "JAWA BARAT" };
    const JAYAPURA = { id: "jyp", lokasi: "KOTA JAYAPURA", daerah: "PAPUA" };
    const day = (date: string) => ({ date, tanggal: date }) as never;
    const ok = (city: { id: string; lokasi: string; daerah: string }, dates: string[]) => ({
      status: true,
      data: { ...city, jadwal: dates.map(day) },
    });

    function deferred<T>() {
      let resolve!: (v: T) => void;
      let reject!: (e: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    beforeEach(() => {
      // 30 Sep 23:30 WIB = 1 Oct 01:30 WIT
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-09-30T16:30:00Z"));
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it("switches city right away and loads the city's current month", async () => {
      const { getSchedule } = await import("@/lib/api");
      const pending = deferred<Awaited<ReturnType<typeof getSchedule>>>();
      vi.mocked(getSchedule).mockReset().mockReturnValue(pending.promise);
      const { useStore } = await import("./useStore");
      useStore.setState({ countdownSchedule: [day("2026-09-30")], schedule: { data: [day("2026-09-30")], loading: false, error: null } });

      const result = useStore.getState().loadCitySchedule(JAYAPURA);

      let state = useStore.getState();
      expect(state.location).toEqual({ cityId: "jyp", cityName: "KOTA JAYAPURA", province: "PAPUA", timezone: "WIT" });
      // Already 1 October in Jayapura
      expect(getSchedule).toHaveBeenCalledWith("jyp", 2026, 10);
      expect(state.viewMonth).toBe(10);
      expect(state.todayDateStr).toBe("2026-10-01");
      // Nothing from the previous city stays on screen
      expect(state.schedule).toEqual({ data: [], loading: true, error: null });
      expect(state.countdownSchedule).toEqual([]);

      pending.resolve(ok(JAYAPURA, ["2026-10-01"]));
      expect(await result).toEqual({ ok: true });
      state = useStore.getState();
      expect(state.schedule).toEqual({ data: [day("2026-10-01")], loading: false, error: null });
      expect(state.countdownSchedule).toEqual([day("2026-10-01")]);
    });

    it("takes the time zone from the province in the response", async () => {
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockReset().mockResolvedValue(ok({ ...JAYAPURA, daerah: "PAPUA" }, ["2026-10-01"]));
      const { useStore } = await import("./useStore");
      await useStore.getState().loadCitySchedule({ id: "jyp", lokasi: "KOTA JAYAPURA" });
      expect(useStore.getState().location.timezone).toBe("WIT");
      expect(useStore.getState().location.province).toBe("PAPUA");
    });

    it("keeps the current data on screen while reloading the same city", async () => {
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockReset().mockReturnValue(new Promise(() => {}));
      const { useStore } = await import("./useStore");
      useStore.getState().setLocation(BANDUNG, "WIB");
      useStore.setState({ viewYear: 2026, viewMonth: 9, countdownSchedule: [day("2026-09-30")], schedule: { data: [day("2026-09-30")], loading: false, error: null } });

      useStore.getState().loadCitySchedule(BANDUNG);
      const state = useStore.getState();
      expect(state.schedule).toEqual({ data: [day("2026-09-30")], loading: true, error: null });
      expect(state.countdownSchedule).toEqual([day("2026-09-30")]);
    });

    it("applies only the newest city when responses arrive out of order", async () => {
      const { getSchedule } = await import("@/lib/api");
      const slowBandung = deferred<Awaited<ReturnType<typeof getSchedule>>>();
      vi.mocked(getSchedule)
        .mockReset()
        .mockReturnValueOnce(slowBandung.promise)
        .mockResolvedValueOnce(ok(JAYAPURA, ["2026-10-01"]));
      const { useStore } = await import("./useStore");

      const first = useStore.getState().loadCitySchedule(BANDUNG);
      const second = useStore.getState().loadCitySchedule(JAYAPURA);
      expect(await second).toEqual({ ok: true });

      slowBandung.resolve(ok(BANDUNG, ["2026-09-01"]));
      expect(await first).toEqual({ ok: false, superseded: true });

      const state = useStore.getState();
      expect(state.location.cityName).toBe("KOTA JAYAPURA");
      expect(state.schedule.data).toEqual([day("2026-10-01")]);
      expect(state.countdownSchedule).toEqual([day("2026-10-01")]);
    });

    it("drops a late failure of a superseded city instead of showing its error", async () => {
      const { getSchedule } = await import("@/lib/api");
      const slowBandung = deferred<Awaited<ReturnType<typeof getSchedule>>>();
      vi.mocked(getSchedule)
        .mockReset()
        .mockReturnValueOnce(slowBandung.promise)
        .mockResolvedValueOnce(ok(JAYAPURA, ["2026-10-01"]));
      const { useStore } = await import("./useStore");

      const first = useStore.getState().loadCitySchedule(BANDUNG);
      await useStore.getState().loadCitySchedule(JAYAPURA);
      slowBandung.reject(new Error("timeout"));
      expect(await first).toEqual({ ok: false, superseded: true });
      expect(useStore.getState().schedule.error).toBeNull();
    });

    it("lets month navigation keep the table while the countdown still gets this month", async () => {
      const { getSchedule } = await import("@/lib/api");
      const slowCity = deferred<Awaited<ReturnType<typeof getSchedule>>>();
      vi.mocked(getSchedule)
        .mockReset()
        .mockReturnValueOnce(slowCity.promise)
        .mockResolvedValueOnce(ok(BANDUNG, ["2026-11-01"]));
      const { useStore } = await import("./useStore");

      const load = useStore.getState().loadCitySchedule(BANDUNG);
      await useStore.getState().fetchScheduleForMonth(2026, 11);
      slowCity.resolve(ok(BANDUNG, ["2026-09-30"]));
      expect(await load).toEqual({ ok: true });

      const state = useStore.getState();
      expect(state.viewMonth).toBe(11);
      expect(state.schedule.data).toEqual([day("2026-11-01")]);
      expect(state.countdownSchedule).toEqual([day("2026-09-30")]);
    });

    it("reports missing data and network failures on the table", async () => {
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockReset().mockResolvedValueOnce({ status: false, message: "not found" } as never);
      const { useStore } = await import("./useStore");

      expect(await useStore.getState().loadCitySchedule(BANDUNG)).toEqual({ ok: false, error: "Data jadwal tidak tersedia" });
      expect(useStore.getState().schedule).toMatchObject({ loading: false, error: "Data jadwal tidak tersedia" });

      vi.mocked(getSchedule).mockRejectedValueOnce(new TypeError("Failed to fetch"));
      vi.stubGlobal("navigator", { onLine: false });
      const result = await useStore.getState().loadCitySchedule(BANDUNG);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/offline/);
      expect(useStore.getState().schedule.error).toMatch(/offline/);
    });
  });

  describe("fetchScheduleForMonth and the countdown", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("refills an empty countdown when the table loads the current month (\"Coba Lagi\")", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-09T03:00:00Z"));
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockReset().mockResolvedValue({
        status: true,
        data: { id: "x", lokasi: "X", daerah: "X", jadwal: [{ date: "2026-10-09" } as never] },
      });
      const { useStore } = await import("./useStore");

      await useStore.getState().fetchScheduleForMonth(2026, 11);
      expect(useStore.getState().countdownSchedule).toEqual([]);

      await useStore.getState().fetchScheduleForMonth(2026, 10);
      expect(useStore.getState().countdownSchedule).toHaveLength(1);
    });
  });

  describe("beginScheduleLoad", () => {
    it("keeps data when revalidating the same city and month", async () => {
      const { useStore } = await import("./useStore");
      const { location, viewYear, viewMonth } = useStore.getState();
      useStore.getState().setSchedule([{ date: "x" } as never]);
      useStore.getState().beginScheduleLoad(location.cityId, viewYear, viewMonth);
      expect(useStore.getState().schedule).toEqual({ data: [{ date: "x" }], loading: true, error: null });
    });

    it("clears data when loading another city", async () => {
      const { useStore } = await import("./useStore");
      const { viewYear, viewMonth } = useStore.getState();
      useStore.getState().setSchedule([{ date: "x" } as never]);
      useStore.getState().beginScheduleLoad("other-city", viewYear, viewMonth);
      expect(useStore.getState().schedule.data).toEqual([]);
    });
  });

  describe("refetchSchedule at month end", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("appends next month's days on the last day of the month", async () => {
      // 31 Jan, 20:00 WIB
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-01-31T13:00:00Z"));
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockImplementation(async (_id, _y, m) => ({
        status: true,
        data: { id: "x", lokasi: "X", daerah: "X", jadwal: [{ date: m === 1 ? "2026-01-31" : "2026-02-01" } as never] },
      }));

      const { useStore } = await import("./useStore");
      await useStore.getState().refetchSchedule();
      expect(vi.mocked(getSchedule)).toHaveBeenCalledWith(expect.any(String), 2026, 1);
      expect(vi.mocked(getSchedule)).toHaveBeenCalledWith(expect.any(String), 2026, 2);
      expect(useStore.getState().countdownSchedule.map((d) => d.date)).toEqual(["2026-01-31", "2026-02-01"]);
    });

    it("rolls over to January of next year on 31 December", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-12-31T13:00:00Z"));
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockResolvedValue({ status: true, data: { id: "x", lokasi: "X", daerah: "X", jadwal: [] } });

      const { useStore } = await import("./useStore");
      await useStore.getState().refetchSchedule();
      expect(vi.mocked(getSchedule)).toHaveBeenCalledWith(expect.any(String), 2027, 1);
    });

    it("uses the location's timezone to decide the date", async () => {
      // 30 Jan 23:30 WIB is already 31 Jan 01:30 in WIT
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-01-30T16:30:00Z"));
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockResolvedValue({ status: true, data: { id: "x", lokasi: "X", daerah: "X", jadwal: [] } });

      const { useStore } = await import("./useStore");
      useStore.getState().setLocation({ id: "papua", lokasi: "KOTA JAYAPURA", daerah: "PAPUA" }, "WIT");
      await useStore.getState().refetchSchedule();
      expect(vi.mocked(getSchedule)).toHaveBeenCalledWith("papua", 2026, 2);
    });

    it("fetches only the current month on other days", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-01-15T13:00:00Z"));
      const { getSchedule } = await import("@/lib/api");
      vi.mocked(getSchedule).mockClear();
      vi.mocked(getSchedule).mockResolvedValue({ status: true, data: { id: "x", lokasi: "X", daerah: "X", jadwal: [] } });

      const { useStore } = await import("./useStore");
      await useStore.getState().refetchSchedule();
      expect(vi.mocked(getSchedule)).toHaveBeenCalledTimes(1);
    });
  });
});
