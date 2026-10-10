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
    const upstream = await import("./upstream");
    expect(upstream.MYQURAN_API_BASE).toBe("https://api.myquran.com/v3/sholat");
    expect(upstream.NOMINATIM_REVERSE_URL).toBe("https://nominatim.openstreetmap.org/reverse");
  });

  it("reach GitHub for the suggestions, with a token only when one is set", async () => {
    vi.stubEnv("SUGGESTION_GITHUB_API", "");
    vi.stubEnv("SUGGESTION_GITHUB_REPO", "");
    vi.stubEnv("SUGGESTION_GITHUB_TOKEN", "");
    const upstream = await import("./upstream");
    expect(upstream.SUGGESTION_GITHUB_API).toBe("https://api.github.com");
    expect(upstream.SUGGESTION_GITHUB_REPO).toBe("irfan-yulianto/si-imsak");
    expect(upstream.suggestionToken()).toBe("");
    // Read when asked, not when the module loads
    vi.stubEnv("SUGGESTION_GITHUB_TOKEN", "ghp_test");
    expect(upstream.suggestionToken()).toBe("ghp_test");
  });

  it("can be pointed at a local mock through the environment", async () => {
    vi.stubEnv("MYQURAN_API_BASE", "http://127.0.0.1:3101/myquran");
    vi.stubEnv("NOMINATIM_REVERSE_URL", "http://127.0.0.1:3101/nominatim/reverse");
    vi.stubEnv("SUGGESTION_GITHUB_API", "http://127.0.0.1:3101/github");
    const upstream = await import("./upstream");
    expect(upstream.MYQURAN_API_BASE).toBe("http://127.0.0.1:3101/myquran");
    expect(upstream.NOMINATIM_REVERSE_URL).toBe("http://127.0.0.1:3101/nominatim/reverse");
    expect(upstream.SUGGESTION_GITHUB_API).toBe("http://127.0.0.1:3101/github");
  });
});
