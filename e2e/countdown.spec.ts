import { test, expect, seedCity, cityDate, cityInstant, countdown, nextPrayerLabel, pauseClock } from "./fixtures";
import { e2eBuildTime } from "../scripts/e2e-build-time.cjs";
import { JAKARTA } from "./data.cjs";

const DAY = 86_400_000;
const BUILD = e2eBuildTime();
// A day in the middle of the build's month
const MID = cityDate(BUILD + 10 * DAY, JAKARTA);
const at = (hhmmss: string) => cityInstant(JAKARTA, MID.year, MID.month, MID.day, hhmmss);

test.beforeEach(async ({ page }) => {
  await seedCity(page, JAKARTA);
});

test("counts down to the next prayer and announces it when it arrives @desktop", async ({ page }) => {
  await page.clock.install({ time: at("11:43:45") });
  await page.goto("/");
  await expect(nextPrayerLabel(page)).toHaveText("Menuju Waktu Dzuhur");
  await expect(countdown(page)).toContainText("11:44 WIB");

  const paused = await pauseClock(page);
  await page.clock.runFor(at("11:44:00") - paused + 1_500);
  await expect(countdown(page).getByText("Waktunya Dzuhur!", { exact: true })).toBeVisible();
});

test("doesn't announce a prayer time that passed while the phone was asleep", async ({ page }) => {
  await page.clock.install({ time: at("11:43:45") });
  await page.goto("/");
  await expect(nextPrayerLabel(page)).toHaveText("Menuju Waktu Dzuhur");

  await pauseClock(page);
  // Lid closed for two hours: due timers fire once, late
  await page.clock.fastForward("02:00:00");
  await expect(nextPrayerLabel(page)).toHaveText("Menuju Waktu Ashar");
  await expect(countdown(page).getByText("Waktunya Dzuhur!", { exact: true })).toHaveCount(0);
});

test("after Isya on the last day of a month, counts down to Imsak with next month's data", async ({ page }) => {
  // The build is at 03:00 WIB on the 1st, so the day before is a month's last day
  const last = cityDate(BUILD - DAY, JAKARTA);
  await page.clock.install({ time: cityInstant(JAKARTA, last.year, last.month, last.day, "19:00:30") });
  await page.goto("/");
  await expect(nextPrayerLabel(page)).toHaveText("Menuju Imsak Besok");
  await expect(countdown(page)).toContainText("04:11 WIB");
});

test("moves today's card to the next day at midnight", async ({ page }) => {
  await page.clock.install({ time: at("23:59:50") });
  await page.goto("/");
  await expect(page.getByText(MID.label).first()).toBeVisible();

  const paused = await pauseClock(page);
  await page.clock.runFor(at("23:59:59") + 1_000 - paused + 3_500);
  const next = cityDate(at("23:59:59") + 2_000, JAKARTA);
  await expect(page.getByText(next.label).first()).toBeVisible();
});
