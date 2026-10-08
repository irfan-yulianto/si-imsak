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

  describe("hydrateFromCache", () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    it("loads the cached schedule for the current month without a loading state", async () => {
      localStorage.setItem("selectedLocation", JSON.stringify({ id: "bali", lokasi: "KOTA DENPASAR", daerah: "BALI" }));
      localStorage.setItem(
        `schedule_bali_${year}_${month}`,
        JSON.stringify({ _ts: Date.now(), status: true, data: { jadwal: [{ date: "x" }] } })
      );
      const { useStore } = await import("./useStore");
      expect(useStore.getState().schedule.loading).toBe(true);

      useStore.getState().hydrateFromCache();
      const state = useStore.getState();
      expect(state.schedule).toEqual({ data: [{ date: "x" }], loading: false, error: null });
      expect(state.countdownSchedule).toHaveLength(1);
      expect(state.viewMonth).toBe(month);
      expect(state.viewYear).toBe(year);
    });

    it("ignores an expired cached schedule", async () => {
      localStorage.setItem("selectedLocation", JSON.stringify({ id: "bali", lokasi: "KOTA DENPASAR", daerah: "BALI" }));
      localStorage.setItem(
        `schedule_bali_${year}_${month}`,
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
