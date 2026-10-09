import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import manifest from "./manifest";

/** Width and height from a PNG's header */
function pngSize(file: string): [number, number] {
  const header = fs.readFileSync(file).subarray(0, 24);
  return [header.readUInt32BE(16), header.readUInt32BE(20)];
}

describe("manifest", () => {
  it("lists a narrow and a wide screenshot that exist at the stated sizes", () => {
    const { screenshots = [] } = manifest();
    expect(screenshots.map((s) => s.form_factor).sort()).toEqual(["narrow", "wide"]);

    for (const shot of screenshots) {
      const [width, height] = pngSize(path.join(process.cwd(), "public", shot.src));
      expect(shot.sizes).toBe(`${width}x${height}`);
      // What Chrome's install dialog accepts: portrait for narrow, landscape for wide,
      // each side 320–3840 px and at most 2.3 times the other
      expect(shot.form_factor === "narrow" ? height > width : width > height).toBe(true);
      expect(Math.min(width, height)).toBeGreaterThanOrEqual(320);
      expect(Math.max(width, height)).toBeLessThanOrEqual(3840);
      expect(Math.max(width, height) / Math.min(width, height)).toBeLessThanOrEqual(2.3);
    }
  });

  it("offers the mosque finder as a shortcut rather than repeating the start page", () => {
    const { shortcuts = [], start_url } = manifest();
    expect(shortcuts.map((s) => s.url)).toEqual(["/?tab=masjid"]);
    expect(start_url).toBe("/");
  });
});
