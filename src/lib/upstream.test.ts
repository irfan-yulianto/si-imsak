// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("upstream addresses", () => {
  it("use the public services by default", async () => {
    vi.stubEnv("MYQURAN_API_BASE", "");
    vi.stubEnv("NOMINATIM_REVERSE_URL", "");
    vi.stubEnv("OVERPASS_ENDPOINTS", "");
    const upstream = await import("./upstream");
    expect(upstream.MYQURAN_API_BASE).toBe("https://api.myquran.com/v3/sholat");
    expect(upstream.NOMINATIM_REVERSE_URL).toBe("https://nominatim.openstreetmap.org/reverse");
    expect(upstream.OVERPASS_ENDPOINTS).toEqual([
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass-api.de/api/interpreter",
    ]);
  });

  it("can be pointed at a local mock through the environment", async () => {
    vi.stubEnv("MYQURAN_API_BASE", "http://127.0.0.1:3101/myquran");
    vi.stubEnv("NOMINATIM_REVERSE_URL", "http://127.0.0.1:3101/nominatim/reverse");
    vi.stubEnv("OVERPASS_ENDPOINTS", " http://127.0.0.1:3101/overpass/a , http://127.0.0.1:3101/overpass/b ,");
    const upstream = await import("./upstream");
    expect(upstream.MYQURAN_API_BASE).toBe("http://127.0.0.1:3101/myquran");
    expect(upstream.NOMINATIM_REVERSE_URL).toBe("http://127.0.0.1:3101/nominatim/reverse");
    expect(upstream.OVERPASS_ENDPOINTS).toEqual([
      "http://127.0.0.1:3101/overpass/a",
      "http://127.0.0.1:3101/overpass/b",
    ]);
  });
});
