import { describe, it, expect, vi } from "vitest";
import { getTimezone, normalizeProvince } from "./timezone";
import { TIMEZONE_MAP } from "./constants";

describe("getTimezone", () => {
  // WIB provinces
  it.each([
    "ACEH",
    "SUMATERA UTARA",
    "SUMATERA BARAT",
    "RIAU",
    "JAMBI",
    "SUMATERA SELATAN",
    "BENGKULU",
    "LAMPUNG",
    "DKI JAKARTA",
    "JAWA BARAT",
    "JAWA TENGAH",
    "DI YOGYAKARTA",
    "JAWA TIMUR",
    "BANTEN",
    "KALIMANTAN BARAT",
    "KALIMANTAN TENGAH",
    "KEP. BANGKA BELITUNG",
    "KEP. RIAU",
  ])("returns WIB for %s", (province) => {
    expect(getTimezone(province)).toBe("WIB");
  });

  // WITA provinces
  it.each([
    "BALI",
    "NUSA TENGGARA BARAT",
    "NUSA TENGGARA TIMUR",
    "KALIMANTAN SELATAN",
    "KALIMANTAN TIMUR",
    "KALIMANTAN UTARA",
    "SULAWESI UTARA",
    "SULAWESI TENGAH",
    "SULAWESI SELATAN",
    "SULAWESI TENGGARA",
    "GORONTALO",
    "SULAWESI BARAT",
  ])("returns WITA for %s", (province) => {
    expect(getTimezone(province)).toBe("WITA");
  });

  // WIT provinces
  it.each([
    "MALUKU",
    "MALUKU UTARA",
    "PAPUA",
    "PAPUA BARAT",
    "PAPUA BARAT DAYA",
    "PAPUA TENGAH",
    "PAPUA PEGUNUNGAN",
    "PAPUA SELATAN",
  ])("returns WIT for %s", (province) => {
    expect(getTimezone(province)).toBe("WIT");
  });

  it("is case insensitive", () => {
    expect(getTimezone("bali")).toBe("WITA");
    expect(getTimezone("dki jakarta")).toBe("WIB");
  });

  it("trims whitespace", () => {
    expect(getTimezone("  BALI  ")).toBe("WITA");
  });

  it("returns WIB as default for unknown province and warns once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getTimezone("UNKNOWN")).toBe("WIB");
    expect(getTimezone("unknown")).toBe("WIB");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("covers all 38 provinces: 18 WIB, 12 WITA, 8 WIT", () => {
    const zones = Object.values(TIMEZONE_MAP);
    expect(zones).toHaveLength(38);
    expect(zones.filter((z) => z === "WIB")).toHaveLength(18);
    expect(zones.filter((z) => z === "WITA")).toHaveLength(12);
    expect(zones.filter((z) => z === "WIT")).toHaveLength(8);
  });

  it.each([
    ["Kepulauan Riau", "WIB"],
    ["Kepulauan Bangka Belitung", "WIB"],
    ["D.I. Yogyakarta", "WIB"],
    ["Daerah Istimewa Yogyakarta", "WIB"],
    ["Daerah Khusus Ibukota Jakarta", "WIB"],
    ["Kalimantan  Tengah", "WIB"],
    ["Sulawesi Barat", "WITA"],
    ["Papua Barat Daya", "WIT"],
  ])("resolves spelling variant %s → %s", (province, tz) => {
    expect(getTimezone(province)).toBe(tz);
  });

  it("normalizes punctuation and spacing", () => {
    expect(normalizeProvince(" Kep. Bangka  Belitung ")).toBe("KEP BANGKA BELITUNG");
  });

  it("returns WIB for empty string", () => {
    expect(getTimezone("")).toBe("WIB");
  });
});
