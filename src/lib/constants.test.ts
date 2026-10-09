import { describe, it, expect } from "vitest";
import { DEFAULT_LOCATION, TIMEZONE_MAP } from "./constants";

describe("DEFAULT_LOCATION", () => {
  it("has a 32-char hex id (MD5)", () => {
    expect(DEFAULT_LOCATION.id).toMatch(/^[a-f0-9]{32}$/);
  });

  it("has lokasi of KOTA JAKARTA", () => {
    expect(DEFAULT_LOCATION.lokasi).toBe("KOTA JAKARTA");
  });

  it("has daerah of DKI JAKARTA", () => {
    expect(DEFAULT_LOCATION.daerah).toBe("DKI JAKARTA");
  });
});

describe("TIMEZONE_MAP", () => {
  it("maps DKI JAKARTA to WIB", () => {
    expect(TIMEZONE_MAP["DKI JAKARTA"]).toBe("WIB");
  });

  it("maps BALI to WITA", () => {
    expect(TIMEZONE_MAP["BALI"]).toBe("WITA");
  });

  it("maps PAPUA to WIT", () => {
    expect(TIMEZONE_MAP["PAPUA"]).toBe("WIT");
  });

  it("every value is WIB, WITA, or WIT", () => {
    for (const [, tz] of Object.entries(TIMEZONE_MAP)) {
      expect(["WIB", "WITA", "WIT"]).toContain(tz);
    }
  });
});
