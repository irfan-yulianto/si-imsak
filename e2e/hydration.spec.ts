import { test, expect, seedCity, cityDate, countdown, nextPrayerLabel, todayCard, type MockCity } from "./fixtures";
import { e2eBuildTime } from "../scripts/e2e-build-time.cjs";
import { JAKARTA, DENPASAR, timesFor } from "./data.cjs";

// The page is prerendered at build time; the first client render must match that HTML
// whatever the device clock and time zone say. Any mismatch is a console error, which
// fails the test (see fixtures.ts).
const BUILD = e2eBuildTime();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const cases: { title: string; timezoneId: string; time: number; city: MockCity | null }[] = [
  { title: "45 days after the build, a city in WITA", timezoneId: "Asia/Jakarta", time: BUILD + 45 * DAY, city: DENPASAR },
  { title: "an hour after the build on a WIT device (already the 1st there)", timezoneId: "Asia/Jayapura", time: BUILD + HOUR, city: JAKARTA },
  { title: "an hour after the build in Los Angeles (still the last day there)", timezoneId: "America/Los_Angeles", time: BUILD + HOUR, city: JAKARTA },
  { title: "a first visit from Auckland, 30 days after the build", timezoneId: "Pacific/Auckland", time: BUILD + 30 * DAY, city: null },
];

for (const { title, timezoneId, time, city } of cases) {
  test.describe(title, () => {
    test.use({ timezoneId });

    test("hydrates cleanly and shows the city's today @desktop", async ({ page }) => {
      await page.clock.install({ time });
      if (city) await seedCity(page, city);
      await page.goto("/");

      const shown = city ?? JAKARTA;
      const today = cityDate(time, shown);
      await expect(nextPrayerLabel(page)).toBeVisible();
      await expect(countdown(page)).toContainText(shown.lokasi);
      // Today's card follows the city's calendar, not the device's
      await expect(page.getByText(today.label, { exact: false }).first()).toBeVisible();
      await expect(todayCard(page)).toContainText(timesFor(shown).dzuhur);
      await expect(page.getByText(`${today.monthName} ${today.year}`).first()).toBeVisible();
    });
  });
}
