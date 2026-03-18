import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/store/useStore", () => ({
  useStore: {
    getState: vi.fn(() => ({
      setUserCoords: vi.fn(),
      setScheduleLoading: vi.fn(),
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

  it("returns generic error on unknown geolocation error", async () => {
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (_: unknown, e: Function) => e({ code: 2, PERMISSION_DENIED: 1, TIMEOUT: 3 }) } });
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r.success).toBe(false);
    expect(r.error).toContain("Gagal mendeteksi lokasi");
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
    const c = await import("./cities");
    const a = await import("./api");
    vi.mocked(c.getCityGuess).mockReturnValue("KOTA JAKARTA");
    vi.mocked(a.searchCities).mockResolvedValue({ status: true, data: [] });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r.success).toBe(false);
    expect(r.error).toContain("Kota tidak ditemukan");
  });

  it("returns error when searchCities returns false status", async () => {
    const c = await import("./cities");
    const a = await import("./api");
    vi.mocked(c.getCityGuess).mockReturnValue("KOTA JAKARTA");
    vi.mocked(a.searchCities).mockResolvedValue({ status: false, data: undefined } as never);
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r.success).toBe(false);
    expect(r.error).toContain("Kota tidak ditemukan");
  });

  it("returns error when getSchedule returns unavailable schedule", async () => {
    const c = await import("./cities");
    const a = await import("./api");
    vi.mocked(c.getCityGuess).mockReturnValue("KOTA JAKARTA");
    vi.mocked(a.searchCities).mockResolvedValue({ status: true, data: [{ id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" }] });
    vi.mocked(a.getSchedule).mockResolvedValue({ status: false, data: { id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA", jadwal: undefined } } as never);
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r.success).toBe(false);
    expect(r.error).toContain("Data jadwal tidak tersedia");
  });

  it("returns offline error when exception occurs and navigator is offline", async () => {
    const c = await import("./cities");
    const a = await import("./api");
    vi.mocked(c.getCityGuess).mockReturnValue("KOTA JAKARTA");
    vi.mocked(a.searchCities).mockResolvedValue({ status: true, data: [{ id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" }] });
    vi.mocked(a.getSchedule).mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition: (cb: Function) => cb({ coords: { latitude: -6.17, longitude: 106.85 } }) },
      onLine: false,
    });
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r.success).toBe(false);
    expect(r.error).toContain("Gagal memuat jadwal");
  });

  it("returns general error when exception occurs and navigator is online", async () => {
    const c = await import("./cities");
    const a = await import("./api");
    vi.mocked(c.getCityGuess).mockReturnValue("KOTA JAKARTA");
    vi.mocked(a.searchCities).mockResolvedValue({ status: true, data: [{ id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" }] });
    vi.mocked(a.getSchedule).mockRejectedValue(new Error("Network error"));
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r.success).toBe(false);
    expect(r.error).toContain("Gagal memuat jadwal");
  });

  it("saves location to localStorage on success", async () => {
    // Re-establish mock implementations (previous tests may have changed them)
    const c = await import("./cities");
    const a = await import("./api");
    vi.mocked(c.getCityGuess).mockReturnValue("KOTA JAKARTA");
    vi.mocked(a.searchCities).mockResolvedValue({ status: true, data: [{ id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" }] });
    vi.mocked(a.getSchedule).mockResolvedValue({ status: true, data: { id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA", jadwal: [{ date: "2026-03-01" } as never] } });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    await detectAndUpdateLocation();
    expect(localStorage.getItem("selectedLocation")).toBeTruthy();
  });
});
