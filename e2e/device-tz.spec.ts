import { test, expect, seedCity, cityDate, cityInstant, countdown, nextPrayerLabel } from "./fixtures";
import { e2eBuildTime } from "../scripts/e2e-build-time.cjs";
import { JAKARTA, JAYAPURA } from "./data.cjs";

const MID = cityDate(e2eBuildTime() + 10 * 86_400_000, JAKARTA);

test.describe("a device in WIT showing a city in WIB", () => {
  test.use({ timezoneId: "Asia/Jayapura" });

  test("counts down in the city's time zone, not the device's", async ({ page }) => {
    // 11:00 in Jakarta is 13:00 on the device
    await page.clock.install({ time: cityInstant(JAKARTA, MID.year, MID.month, MID.day, "11:00:00") });
    await seedCity(page, JAKARTA);
    await page.goto("/");
    await expect(nextPrayerLabel(page)).toHaveText("Menuju Waktu Dzuhur");
    await expect(countdown(page)).toContainText("11:44 WIB");
    await expect(countdown(page).getByRole("timer")).toContainText(/00\s*Jam\s*:?\s*4[34]\s*Menit/);
  });
});

test.describe("a device in WIB showing a city in WIT", () => {
  test("rolls over to the city's next day before the device does", async ({ page }) => {
    // 23:30 in Jakarta is already 01:30 the next day in Jayapura
    const instant = cityInstant(JAKARTA, MID.year, MID.month, MID.day, "23:30:00");
    await page.clock.install({ time: instant });
    await seedCity(page, JAYAPURA);
    await page.goto("/");
    const jayapuraToday = cityDate(instant, JAYAPURA);
    await expect(page.getByText(jayapuraToday.label).first()).toBeVisible();
    await expect(nextPrayerLabel(page)).toHaveText("Menuju Waktu Imsak");
  });
});
