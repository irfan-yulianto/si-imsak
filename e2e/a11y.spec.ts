import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect, seedCity, todayCard } from "./fixtures";
import { JAKARTA, timesFor } from "./data.cjs";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Contrast is checked on the final frame, not halfway through a fade-in
test.use({ contextOptions: { reducedMotion: "reduce" } });

async function violations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
}

for (const theme of ["dark", "light"]) {
  test(`schedule view, ${theme} theme @desktop`, async ({ page }) => {
    await seedCity(page, JAKARTA, theme === "light" ? { theme: "light" } : {});
    await page.goto("/");
    await expect(todayCard(page)).toContainText(timesFor(JAKARTA).dzuhur);
    expect(await violations(page)).toEqual([]);
  });
}

test("first visit with the location prompt @desktop", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: /Gunakan lokasi Anda/ })).toBeVisible();
  await expect(todayCard(page)).toContainText(timesFor(JAKARTA).dzuhur);
  expect(await violations(page)).toEqual([]);
});

test("mosque finder with results, light theme", async ({ page }) => {
  await seedCity(page, JAKARTA, { theme: "light" });
  await page.goto("/?tab=masjid");
  await expect(page.getByRole("link", { name: /^Navigasi ke / }).first()).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test("city search with results open", async ({ page }) => {
  await seedCity(page, JAKARTA);
  await page.goto("/");
  await page.getByRole("combobox", { name: "Cari kota" }).fill("band");
  await expect(page.getByRole("option").first()).toBeVisible();
  expect(await violations(page)).toEqual([]);
});
