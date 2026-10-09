import { test, expect, seedCity, countdown, todayCard } from "./fixtures";
import { JAKARTA, BANDUNG, timesFor } from "./data.cjs";

test("a late answer for the previous city never replaces the new city's schedule @desktop", async ({ page }) => {
  await seedCity(page, JAKARTA);

  // Hold Jakarta's next-month response until the user has moved on to Bandung
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  let heldMonth = "";
  await page.route("**/api/schedule**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("city_id") === JAKARTA.id && url.searchParams.get("month") === heldMonth) {
      await released;
    }
    await route.fallback();
  });

  await page.goto("/");
  await expect(todayCard(page)).toContainText(timesFor(JAKARTA).dzuhur);

  const viewed = await page.evaluate(() => new Date().getMonth() + 1);
  heldMonth = String(viewed === 12 ? 1 : viewed + 1);
  await page.getByRole("button", { name: "Bulan berikutnya" }).click();

  await page.getByRole("combobox", { name: "Cari kota" }).fill("bandung");
  await page.getByRole("option", { name: "KOTA BANDUNG" }).click();
  await expect(countdown(page)).toContainText("KOTA BANDUNG");
  await expect(todayCard(page)).toContainText(timesFor(BANDUNG).dzuhur);

  const late = page.waitForResponse((r) => r.url().includes(JAKARTA.id) && r.url().includes(`month=${heldMonth}`));
  release();
  await late;

  // Still Bandung, still this month
  await expect(countdown(page)).toContainText("KOTA BANDUNG");
  await expect(page.getByRole("button", { name: "Bulan berikutnya" })).toBeVisible();
  await expect(page.locator('[aria-current="date"]:visible').first()).toContainText(timesFor(BANDUNG).dzuhur);
  await expect(page.getByText(timesFor(JAKARTA).dzuhur)).toHaveCount(0);
});
