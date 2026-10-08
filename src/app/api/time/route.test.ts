// @vitest-environment node
import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/time", () => {
  it("returns the server clock and is never cached", async () => {
    const before = Date.now();
    const res = GET();
    const json = await res.json();
    expect(json.now).toBeGreaterThanOrEqual(before);
    expect(json.now).toBeLessThanOrEqual(Date.now());
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
