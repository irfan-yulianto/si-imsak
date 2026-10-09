import path from "node:path";
import { devices, type Page } from "@playwright/test";
import { test, seedCity } from "./fixtures";
import { JAKARTA, scheduleResponse } from "./data.cjs";

// Screenshots for the base-vs-head comparison in .github/workflows/visual.yml. The same
// spec runs against both builds, so every state is set up through storage, URL and
// mocked responses only (no clicks), and the clock is fixed.
const SHOTS = process.env.SHOTS_DIR;
test.skip(!SHOTS, "Only runs for the screenshot comparison (SHOTS_DIR)");

// 15 March 2026, 10:00:00 WIB
const NOW = Date.UTC(2026, 2, 15, 3, 0, 0);

/** Three mosques north-east of the point searched, ~340 m apart */
const mosquesAround = (lat: number, lng: number) =>
  Array.from({ length: 3 }, (_, i) => ({
    id: `node/${1000 + i}`,
    name: i === 2 ? "Musholla Al-Ikhlas" : `Masjid Uji ${i + 1}`,
    lat: lat + (i + 1) * 0.0022,
    lng: lng + (i + 1) * 0.0022,
    distance: (i + 1) * 340,
    address: `Jalan Uji ${i + 1}`,
    type: i === 2 ? "musholla" : "masjid",
  }));

async function prepare(page: Page, { scheduleStatus = 200 }: { scheduleStatus?: number } = {}) {
  await page.clock.setFixedTime(NOW);
  await page.route("**/api/schedule**", (route) => {
    if (scheduleStatus !== 200) return route.fulfill({ status: scheduleStatus, json: { status: false } });
    const url = new URL(route.request().url());
    return route.fulfill({ json: scheduleResponse(JAKARTA, Number(url.searchParams.get("year")), Number(url.searchParams.get("month"))) });
  });
  await page.route("**/api/mosques**", (route) => {
    const url = new URL(route.request().url());
    const data = mosquesAround(Number(url.searchParams.get("lat")), Number(url.searchParams.get("lng")));
    return route.fulfill({ json: { status: true, data } });
  });
  await page.route("**/api/cities**", (route) => route.fulfill({ json: { status: true, data: [] } }));
}

async function shoot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: path.join(SHOTS!, `${name}.png`),
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    // The digits depend on when the first 1 s tick lands
    mask: [page.getByRole("timer")],
  });
}

// The phone's screen and input, without its browser choice (not allowed inside a describe)
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"];
const PHONE = { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch };

const scenarios: { name: string; device: "mobile" | "desktop"; theme?: "light"; seed: boolean; url?: string; scheduleStatus?: number }[] = [
  { name: "mobile-dark", device: "mobile", seed: true },
  { name: "mobile-light", device: "mobile", theme: "light", seed: true },
  { name: "mobile-first-visit", device: "mobile", seed: false },
  { name: "mobile-masjid", device: "mobile", theme: "light", seed: true, url: "/?tab=masjid" },
  { name: "mobile-schedule-error", device: "mobile", seed: true, scheduleStatus: 500 },
  { name: "desktop-dark", device: "desktop", seed: true },
  { name: "desktop-light", device: "desktop", theme: "light", seed: true },
];

for (const s of scenarios) {
  test.describe(s.name, () => {
    test.use(s.device === "mobile" ? PHONE : { viewport: { width: 1280, height: 800 } });
    if (s.scheduleStatus) test.use({ allowConsole: /Failed to load resource/ });

    test(`screenshot ${s.name}`, async ({ page }) => {
      await prepare(page, { scheduleStatus: s.scheduleStatus });
      if (s.seed) await seedCity(page, JAKARTA, s.theme ? { theme: s.theme } : {});
      await page.goto(s.url ?? "/");
      await shoot(page, s.name);
    });
  });
}
