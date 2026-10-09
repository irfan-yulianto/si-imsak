import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSchedule, reverseGeocodeCity, searchCities } from "@/lib/api";
import { getCityGuess } from "@/lib/cities";
import { useStore } from "./useStore";
import { BANDUNG, JAKARTA, asCity, day, resetStore, scheduleResponse } from "@/__tests__/store";

vi.mock("@/lib/api", () => ({
  getSchedule: vi.fn(),
  reverseGeocodeCity: vi.fn(),
  searchCities: vi.fn(),
}));
vi.mock("@/lib/cities", () => ({ getCityGuess: vi.fn() }));

const geoError = (code: number) => ({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });

function gpsAt(latitude: number, longitude: number) {
  vi.stubGlobal("navigator", {
    onLine: true,
    geolocation: {
      getCurrentPosition: (ok: (pos: { coords: { latitude: number; longitude: number } }) => void) =>
        ok({ coords: { latitude, longitude } }),
    },
  });
}

function gpsFails(code: number) {
  vi.stubGlobal("navigator", {
    onLine: true,
    geolocation: { getCurrentPosition: (_: unknown, fail: (error: ReturnType<typeof geoError>) => void) => fail(geoError(code)) },
  });
}

beforeEach(() => {
  resetStore();
  localStorage.clear();
  vi.mocked(reverseGeocodeCity).mockReset().mockResolvedValue("");
  vi.mocked(getCityGuess).mockReset().mockReturnValue("KOTA JAKARTA");
  vi.mocked(searchCities).mockReset().mockResolvedValue({ status: true, data: [asCity(JAKARTA)] });
  vi.mocked(getSchedule).mockReset().mockResolvedValue(scheduleResponse(JAKARTA, [day("2026-10-09")]));
});

describe("detectCity", () => {
  it("explains when the browser has no geolocation", async () => {
    vi.stubGlobal("navigator", {});
    expect(await useStore.getState().detectCity()).toEqual({ success: false, error: "Perangkat ini tidak mendukung deteksi lokasi." });
  });

  it("explains a refused permission and a timeout", async () => {
    gpsFails(1);
    expect((await useStore.getState().detectCity()).error).toContain("ditolak");
    gpsFails(3);
    expect((await useStore.getState().detectCity()).error).toContain("habis");
    gpsFails(2);
    expect((await useStore.getState().detectCity()).error).toBe("Gagal mendeteksi lokasi.");
  });

  it("finds, saves and selects the city at the GPS position", async () => {
    gpsAt(-6.17, 106.85);
    expect(await useStore.getState().detectCity()).toEqual({ success: true });

    const state = useStore.getState();
    expect(state.userCoords).toEqual({ lat: -6.17, lng: 106.85 });
    expect(state.location).toEqual(JAKARTA);
    expect(JSON.parse(localStorage.getItem("selectedLocation")!)).toEqual(asCity(JAKARTA));
    expect(Number(localStorage.getItem("locationPermissionDismissed"))).toBeGreaterThan(0);
  });

  it("asks Nominatim first, and only then the local table of city centres", async () => {
    gpsAt(-7.16, 112.65);
    vi.mocked(reverseGeocodeCity).mockResolvedValueOnce("KAB. GRESIK");
    await useStore.getState().detectCity();
    expect(searchCities).toHaveBeenCalledWith("KAB. GRESIK");
    expect(getCityGuess).not.toHaveBeenCalled();

    vi.mocked(reverseGeocodeCity).mockRejectedValueOnce(new Error("network"));
    vi.mocked(getCityGuess).mockReturnValueOnce("KAB. LAMONGAN");
    await useStore.getState().detectCity();
    expect(searchCities).toHaveBeenLastCalledWith("KAB. LAMONGAN");
  });

  it("prefers the search result whose name matches the guess exactly", async () => {
    gpsAt(-6.91, 107.61);
    vi.mocked(reverseGeocodeCity).mockResolvedValueOnce("KOTA BANDUNG");
    vi.mocked(searchCities).mockResolvedValueOnce({
      status: true,
      data: [{ ...asCity(BANDUNG), id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", lokasi: "KAB. BANDUNG" }, asCity(BANDUNG)],
    });
    vi.mocked(getSchedule).mockResolvedValueOnce(scheduleResponse(BANDUNG, [day("2026-10-09")]));
    await useStore.getState().detectCity();
    expect(useStore.getState().location.cityId).toBe(BANDUNG.cityId);
  });

  it("explains a city that can't be found, or a failed search", async () => {
    gpsAt(-6.17, 106.85);
    vi.mocked(getCityGuess).mockReturnValueOnce(null);
    expect(await useStore.getState().detectCity()).toEqual({ success: false, error: "Tidak dapat mendeteksi kota." });

    vi.mocked(searchCities).mockResolvedValueOnce({ status: true, data: [] });
    expect(await useStore.getState().detectCity()).toEqual({ success: false, error: "Kota Anda tidak ada dalam daftar." });

    vi.mocked(searchCities).mockRejectedValueOnce(new Error("offline"));
    expect(await useStore.getState().detectCity()).toEqual({ success: false, error: "Gagal mencari kota. Periksa koneksi internet Anda." });
    expect(localStorage.getItem("selectedLocation")).toBeNull();
  });

  it("passes on a schedule that couldn't be loaded for the detected city", async () => {
    gpsAt(-6.17, 106.85);
    vi.mocked(getSchedule).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await useStore.getState().detectCity()).toEqual({ success: false, error: "Gagal memuat jadwal. Coba lagi nanti." });
  });

  it("keeps a city the user picked by hand while the search was running", async () => {
    gpsAt(-6.17, 106.85);
    vi.mocked(searchCities).mockImplementationOnce(async () => {
      void useStore.getState().selectCity(asCity(BANDUNG));
      return { status: true, data: [asCity(JAKARTA)] };
    });
    vi.mocked(getSchedule).mockResolvedValue(scheduleResponse(BANDUNG, [day("2026-10-09")]));

    expect(await useStore.getState().detectCity()).toEqual({ success: false, superseded: true });
    expect(useStore.getState().location.cityId).toBe(BANDUNG.cityId);
    expect(localStorage.getItem("selectedLocation")).toBeNull();
  });

  it("reports superseded when a hand-picked city wins while the schedule loads", async () => {
    gpsAt(-6.17, 106.85);
    let release!: () => void;
    vi.mocked(getSchedule).mockImplementationOnce(
      () => new Promise((resolve) => (release = () => resolve(scheduleResponse(JAKARTA, [day("2026-10-09")]))))
    );
    const detection = useStore.getState().detectCity();
    await vi.waitFor(() => expect(getSchedule).toHaveBeenCalled());

    vi.mocked(getSchedule).mockResolvedValueOnce(scheduleResponse(BANDUNG, [day("2026-10-09")]));
    await useStore.getState().selectCity(asCity(BANDUNG));
    release();
    expect(await detection).toEqual({ success: false, superseded: true });
    expect(useStore.getState().location.cityId).toBe(BANDUNG.cityId);
  });
});
