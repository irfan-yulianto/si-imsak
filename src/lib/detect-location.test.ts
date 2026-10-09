import { describe, it, expect, vi, beforeEach } from "vitest";

// The parts of the store detection touches; reset before every test
const store = {
  _cityToken: 0,
  setUserCoords: vi.fn(),
  loadCitySchedule: vi.fn(),
};

vi.mock("@/store/useStore", () => ({
  useStore: { getState: () => store },
}));

vi.mock("./cities", () => ({ getCityGuess: vi.fn(() => "KOTA JAKARTA") }));
vi.mock("./api", () => ({
  reverseGeocodeCity: vi.fn(() => Promise.resolve("")),
  searchCities: vi.fn(() => Promise.resolve({ status: true, data: [{ id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" }] })),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  store._cityToken = 0;
  store.loadCitySchedule.mockResolvedValue({ ok: true });
});

function mockGeoSuccess() {
  vi.stubGlobal("navigator", {
    geolocation: { getCurrentPosition: (cb: (pos: { coords: { latitude: number; longitude: number } }) => void) => cb({ coords: { latitude: -6.17, longitude: 106.85 } }) },
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
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (_: unknown, e: (err: { code: number; PERMISSION_DENIED: number; TIMEOUT: number }) => void) => e({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 }) } });
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r.success).toBe(false);
    expect(r.error).toContain("ditolak");
  });

  it("returns error on timeout", async () => {
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (_: unknown, e: (err: { code: number; PERMISSION_DENIED: number; TIMEOUT: number }) => void) => e({ code: 3, PERMISSION_DENIED: 1, TIMEOUT: 3 }) } });
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r.error).toContain("habis");
  });

  it("succeeds with full GPS flow and loads the detected city through the store", async () => {
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    expect((await detectAndUpdateLocation()).success).toBe(true);
    expect(store.setUserCoords).toHaveBeenCalledWith({ lat: -6.17, lng: 106.85 });
    expect(store.loadCitySchedule).toHaveBeenCalledWith({ id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" });
  });

  it("returns error when getCityGuess returns null", async () => {
    const c = await import("./cities");
    vi.mocked(c.getCityGuess).mockReturnValueOnce(null);
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    expect((await detectAndUpdateLocation()).success).toBe(false);
  });

  it("returns error when searchCities returns empty", async () => {
    const a = await import("./api");
    vi.mocked(a.searchCities).mockResolvedValueOnce({ status: true, data: [] });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    expect((await detectAndUpdateLocation()).success).toBe(false);
    expect(store.loadCitySchedule).not.toHaveBeenCalled();
  });

  it("explains a network failure while searching instead of throwing", async () => {
    const a = await import("./api");
    vi.mocked(a.searchCities).mockRejectedValueOnce(new Error("offline"));
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r.success).toBe(false);
    expect(r.error).toBe("Gagal mencari kota. Periksa koneksi internet");
  });

  it("saves location to localStorage on success", async () => {
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    await detectAndUpdateLocation();
    expect(JSON.parse(localStorage.getItem("selectedLocation")!)).toMatchObject({ id: "abc" });
  });

  it("prefers the search result whose name matches the guess exactly", async () => {
    const a = await import("./api");
    vi.mocked(a.reverseGeocodeCity).mockResolvedValueOnce("KOTA BOGOR");
    vi.mocked(a.searchCities).mockResolvedValueOnce({
      status: true,
      data: [
        { id: "kab", lokasi: "KAB. BOGOR", daerah: "JAWA BARAT" },
        { id: "kota", lokasi: "KOTA BOGOR", daerah: "JAWA BARAT" },
      ],
    });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    await detectAndUpdateLocation();
    expect(store.loadCitySchedule).toHaveBeenCalledWith(expect.objectContaining({ id: "kota" }));
  });

  it("passes the schedule error on when the detected city has no data", async () => {
    store.loadCitySchedule.mockResolvedValueOnce({ ok: false, error: "Data jadwal tidak tersedia" });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r).toEqual({ success: false, error: "Data jadwal tidak tersedia" });
  });

  it("keeps a city the user picked while the city search was running", async () => {
    const a = await import("./api");
    vi.mocked(a.searchCities).mockImplementationOnce(async () => {
      store._cityToken++; // the user selects a city by hand meanwhile
      return { status: true, data: [{ id: "abc", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" }] };
    });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    const r = await detectAndUpdateLocation();
    expect(r).toEqual({ success: false, superseded: true });
    expect(store.loadCitySchedule).not.toHaveBeenCalled();
    expect(localStorage.getItem("selectedLocation")).toBeNull();
  });

  it("reports superseded when another city load wins while the schedule loads", async () => {
    store.loadCitySchedule.mockResolvedValueOnce({ ok: false, superseded: true });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    expect(await detectAndUpdateLocation()).toEqual({ success: false, superseded: true });
  });

  it("uses geocoded city name when reverse geocode succeeds", async () => {
    const a = await import("./api");
    const c = await import("./cities");
    vi.mocked(a.reverseGeocodeCity).mockResolvedValueOnce("KAB. GRESIK");
    vi.mocked(c.getCityGuess).mockReturnValueOnce("KAB. LAMONGAN");
    vi.mocked(a.searchCities).mockResolvedValueOnce({ status: true, data: [{ id: "gresik", lokasi: "KAB. GRESIK", daerah: "JAWA TIMUR" }] });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    await detectAndUpdateLocation();
    // searchCities should be called with the geocoded name, NOT the local guess
    expect(a.searchCities).toHaveBeenCalledWith("KAB. GRESIK");
    expect(c.getCityGuess).not.toHaveBeenCalled();
  });

  it("falls back to getCityGuess when reverse geocode returns empty", async () => {
    const a = await import("./api");
    const c = await import("./cities");
    vi.mocked(c.getCityGuess).mockReturnValueOnce("KAB. LAMONGAN");
    vi.mocked(a.searchCities).mockResolvedValueOnce({ status: true, data: [{ id: "lam", lokasi: "KAB. LAMONGAN", daerah: "JAWA TIMUR" }] });
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    await detectAndUpdateLocation();
    expect(a.searchCities).toHaveBeenCalledWith("KAB. LAMONGAN");
  });

  it("falls back to getCityGuess when reverse geocode throws", async () => {
    const a = await import("./api");
    vi.mocked(a.reverseGeocodeCity).mockRejectedValueOnce(new Error("network"));
    mockGeoSuccess();
    const { detectAndUpdateLocation } = await import("./detect-location");
    // Should not throw — gracefully falls back
    const r = await detectAndUpdateLocation();
    expect(r.success).toBe(true);
  });
});
