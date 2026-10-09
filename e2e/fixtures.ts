import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import type { CITIES } from "./data.cjs";

export { expect };

export type MockCity = (typeof CITIES)[number];

interface Options {
  /**
   * Console errors a test provokes on purpose, e.g. the failed requests it simulates.
   * A single pattern: Playwright would read an array given to test.use() as a
   * [value, options] tuple.
   */
  allowConsole: RegExp | undefined;
}

const TZ_HOURS: Record<string, number> = { BALI: 8, PAPUA: 9 };
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** A private address per test, so the API's per-IP rate limit never spills between tests */
function ipFor(testId: string): string {
  const [a, b, c] = createHash("sha1").update(testId).digest();
  return `10.${a}.${b}.${c || 1}`;
}

/**
 * Every test fails on console errors, uncaught page errors and CSP violations, which
 * includes React's hydration errors (#418/#423). Requests that would leave the machine,
 * or that would let the server clock override the faked device clock, are answered here.
 */
export const test = base.extend<Options>({
  allowConsole: [undefined, { option: true }],

  // (named `provide`, not `use`: the React hooks lint rule would mistake it for a hook)
  page: async ({ page, allowConsole }, provide, testInfo) => {
    const problems: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      // The fixture itself answers /api/time with 503 below
      if (text.startsWith("Failed to load resource") && msg.location().url.includes("/api/time")) return;
      if (allowConsole?.test(text)) return;
      problems.push(`console.error: ${text} (${msg.location().url})`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        const w = window as unknown as { __cspViolations?: string[] };
        (w.__cspViolations ??= []).push(`${event.violatedDirective} ${event.blockedURI}`);
      });
    });

    const ip = ipFor(testInfo.testId);
    await page.route("**/api/**", (route) =>
      route.fallback({ headers: { ...route.request().headers(), "x-real-ip": ip } })
    );
    // No server time offset: the tests control the device clock
    await page.route("**/api/time", (route) => route.fulfill({ status: 503, body: "" }));
    // Vercel Analytics and Speed Insights only exist on Vercel
    await page.route("**/_vercel/**", (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
    // The e2e build carries a fake Clarity id; its script is answered locally
    await page.route(/^https:\/\/([a-z0-9-]+\.)*clarity\.ms\//, (route) =>
      route.fulfill({ contentType: "text/javascript", body: "" })
    );

    await provide(page);

    const csp = await page
      .evaluate(() => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [])
      .catch(() => [] as string[]);
    expect([...problems, ...csp.map((v) => `csp: ${v}`)], "console errors, page errors and CSP violations").toEqual([]);
  },
});

/** Seed localStorage before the app starts (once per test, so reloads keep the app's own changes) */
export async function seedStorage(page: Page, entries: Record<string, string>) {
  await page.addInitScript((values) => {
    if (sessionStorage.getItem("__e2eSeeded")) return;
    sessionStorage.setItem("__e2eSeeded", "1");
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, entries);
}

/** A returning visitor with this city saved */
export async function seedCity(page: Page, city: MockCity, extra: Record<string, string> = {}) {
  await seedStorage(page, {
    selectedLocation: JSON.stringify({ id: city.id, lokasi: city.lokasi, daerah: city.daerah }),
    "pwa-install-dismissed": "1",
    ...extra,
  });
}

/** The calendar date in the city's own time zone at this instant */
export function cityDate(epochMs: number, city: MockCity) {
  const shifted = new Date(epochMs + (TZ_HOURS[city.daerah] ?? 7) * 3_600_000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return { year, month, day, monthName: MONTHS[month - 1], label: `${day} ${MONTHS[month - 1]} ${year}` };
}

/** UTC epoch for a wall-clock time in the city's time zone */
export function cityInstant(city: MockCity, year: number, month: number, day: number, hhmmss: string) {
  const [h, m, s = 0] = hhmmss.split(":").map(Number);
  return Date.UTC(year, month - 1, day, h, m, s) - (TZ_HOURS[city.daerah] ?? 7) * 3_600_000;
}

/** Stop the (running) fake clock just ahead of its current time; returns that time */
export async function pauseClock(page: Page): Promise<number> {
  const at = (await page.evaluate(() => Date.now())) + 500;
  await page.clock.pauseAt(at);
  return at;
}

export const countdown = (page: Page): Locator => page.locator('section[aria-label="Hitung mundur waktu sholat"]');
export const todayCard = (page: Page): Locator => page.getByRole("region", { name: "Jadwal sholat hari ini" });
/** The countdown's heading, e.g. "Menuju Waktu Dzuhur" (not the screen-reader announcement) */
export const nextPrayerLabel = (page: Page): Locator =>
  countdown(page).getByText(/^Menuju (Waktu \S+|Imsak Besok)$/);
