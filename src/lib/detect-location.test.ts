import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/store/useStore", () => ({
  useStore: {
    getState: vi.fn(() => ({
      setUserCoords: vi.fn(),
      setScheduleLoading: vi.fn(),
      beginScheduleLoad: vi.fn(),
      setLocation: vi.fn(),
      setSchedule: vi.fn(),
      setCountdownSchedule: vi.fn(),
      setViewMonth: vi.fn(),
      setScheduleError: vi.fn(),
    })),
  },
}));

vi.mock("./cities", () => ({ getCityGuess: vi.fn(() => "KOTA JAKARTA") }));
vi.mock("./api", () => ({
  reverseGeocodeCity: vi.fn(() => Promise.resolve("")),
  searchCities: vi.fn(() => Promise.resolve({ status: true, data: [{ id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" }] })),
  getSchedule: vi.fn(() => Promise.resolve({ status: true, data: { id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA", jadwal: [{ date: "2026-03-01" }] } })),
}));
vi.mock("./timezone", () => ({ getTimezone: vi.fn(() => "WIB") }));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

function mockGeoSuccess() {
  vi.stubGlobal("navigator", {
    geolocation: { getCurrentPosition: (cb: Function) => cb({ coords: { latitude: -6.17, longitude: 106.85 } }) },
    onLine: true,
  });
}

describe("detectAndUpdateLocation", () => {
  it("returns error when geolocation unavailable", async () => {
    vi.stubGlobal("navigator", {});
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r.success).toBe(false);
  });

  it("returns error on permission denied", async () => {
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (_: unknown, e: Function) => e({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 }) } });
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r.success).toBe(false);
    expect(r.error).toContain("ditolak");
  });

  it("returns error on timeout", async () => {
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (_: unknown, e: Function) => e({ code: 3, PERMISSION_DENIED: 1, TIMEOUT: 3 }) } });
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r.error).toContain("habis");
  });

  it("succeeds with full GPS flow", async () => {
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    expect((await detectAndUpdateLocation()).success).toBe(true);
  });

  it("returns error when getCityGuess returns null", async () => {
    const c = await import("./cities");
    vi.mocked(c.getCityGuess).mockReturnValue(null);
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    expect((await detectAndUpdateLocation()).success).toBe(false);
  });

  it("returns error when searchCities returns empty", async () => {
    const a = await import("./api");
    vi.mocked(a.searchCities).mockResolvedValue({ status: true, data: [] });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    expect((await detectAndUpdateLocation()).success).toBe(false);
  });

  it("saves location to localStorage on success", async () => {
    // Re-establish mock implementations (previous tests may have changed them)
    const c = await import("./cities");
    const a = await import("./api");
    vi.mocked(c.getCityGuess).mockReturnValue("KOTA JAKARTA");
    vi.mocked(a.reverseGeocodeCity).mockResolvedValue("");
    vi.mocked(a.searchCities).mockResolvedValue({ status: true, data: [{ id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" }] });
    vi.mocked(a.getSchedule).mockResolvedValue({ status: true, data: { id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA", jadwal: [{ date: "2026-03-01" } as never] } });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    await detectAndUpdateLocation();
    expect(localStorage.getItem("selectedLocation")).toBeTruthy();
  });

  it("uses geocoded city name when reverse geocode succeeds", async () => {
    const a = await import("./api");
    const c = await import("./cities");
    vi.mocked(a.reverseGeocodeCity).mockResolvedValue("KAB. GRESIK");
    vi.mocked(c.getCityGuess).mockReturnValue("KAB. LAMONGAN");
    vi.mocked(a.searchCities).mockResolvedValue({ status: true, data: [{ id: "gresik", lokasi: "KAB. GRESIK", daerah: "JAWA TIMUR" }] });
    vi.mocked(a.getSchedule).mockResolvedValue({ status: true, data: { id: "gresik", lokasi: "KAB. GRESIK", daerah: "JAWA TIMUR", jadwal: [{ date: "2026-03-01" } as never] } });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    await detectAndUpdateLocation();
    // searchCities should be called with the geocoded name, NOT the local guess
    expect(a.searchCities).toHaveBeenCalledWith("KAB. GRESIK");
  });

  it("falls back to getCityGuess when reverse geocode returns empty", async () => {
    const a = await import("./api");
    const c = await import("./cities");
    vi.mocked(a.reverseGeocodeCity).mockResolvedValue("");
    vi.mocked(c.getCityGuess).mockReturnValue("KAB. LAMONGAN");
    vi.mocked(a.searchCities).mockResolvedValue({ status: true, data: [{ id: "lam", lokasi: "KAB. LAMONGAN", daerah: "JAWA TIMUR" }] });
    vi.mocked(a.getSchedule).mockResolvedValue({ status: true, data: { id: "lam", lokasi: "KAB. LAMONGAN", daerah: "JAWA TIMUR", jadwal: [{ date: "2026-03-01" } as never] } });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    await detectAndUpdateLocation();
    expect(a.searchCities).toHaveBeenCalledWith("KAB. LAMONGAN");
  });

  it("falls back to getCityGuess when reverse geocode throws", async () => {
    const a = await import("./api");
    const c = await import("./cities");
    vi.mocked(a.reverseGeocodeCity).mockRejectedValue(new Error("network"));
    vi.mocked(c.getCityGuess).mockReturnValue("KOTA JAKARTA");
    vi.mocked(a.searchCities).mockResolvedValue({ status: true, data: [{ id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" }] });
    vi.mocked(a.getSchedule).mockResolvedValue({ status: true, data: { id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA", jadwal: [{ date: "2026-03-01" } as never] } });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    // Should not throw — gracefully falls back
    const r = await detectAndUpdateLocation();
    expect(r.success).toBe(true);
  });
});
