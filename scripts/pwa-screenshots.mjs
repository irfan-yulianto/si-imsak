// Takes the screenshots that the web manifest offers to the browser's install dialog,
// into public/screenshots. Run it again after a visible change, against a production
// build:
//
//   npm run build && npx next start -p 3100
//   node scripts/pwa-screenshots.mjs        # BASE_URL=… for another address
//
// The schedule comes from the end-to-end fixtures and the clock is fixed, so the pictures
// depend neither on the day nor on the network.
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");
const { JAKARTA, scheduleResponse, timesFor } = require("../e2e/data.cjs");

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const OUT_DIR = new URL("../public/screenshots/", import.meta.url);
// 26 Ramadan 1447, 10:00 in Jakarta: the countdown runs to Dzuhur
const NOW = Date.UTC(2026, 2, 15, 3, 0, 0);

// The sizes are in the manifest too (src/app/manifest.ts)
const SHOTS = [
  { file: "narrow.png", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { file: "wide.png", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
];

fs.mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
try {
  for (const { file, ...device } of SHOTS) {
    const context = await browser.newContext({ ...device, locale: "id-ID", timezoneId: "Asia/Jakarta", serviceWorkers: "block" });
    const page = await context.newPage();
    await page.clock.setFixedTime(NOW);
    // No server clock, analytics or Clarity; the schedule from the fixtures
    await page.route("**/api/time", (route) => route.fulfill({ status: 503, body: "" }));
    await page.route("**/_vercel/**", (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
    await page.route(/clarity\.ms/, (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
    await page.route("**/api/schedule**", (route) => {
      const url = new URL(route.request().url());
      const year = Number(url.searchParams.get("year"));
      const month = Number(url.searchParams.get("month"));
      return route.fulfill({ json: scheduleResponse(JAKARTA, year, month) });
    });
    // A returning visitor in the default (dark) theme
    await page.addInitScript((city) => {
      localStorage.setItem("selectedLocation", JSON.stringify(city));
      localStorage.setItem("pwa-install-dismissed", "1");
    }, { id: JAKARTA.id, lokasi: JAKARTA.lokasi, daerah: JAKARTA.daerah });

    await page.goto(BASE_URL);
    await page.getByRole("region", { name: "Jadwal sholat hari ini" }).getByText(timesFor(JAKARTA).dzuhur).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: new URL(file, OUT_DIR).pathname, animations: "disabled" });
    console.log(`public/screenshots/${file}`);
    await context.close();
  }
} finally {
  await browser.close();
}
