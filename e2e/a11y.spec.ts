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

test("the header's 'Masjid Terdekat' link takes the keyboard focus to the mosque finder @desktop", async ({ page, isMobile }) => {
  test.skip(isMobile, "The link is only shown on wide screens");
  await seedCity(page, JAKARTA);
  await page.goto("/");
  await page.getByRole("link", { name: "Masjid Terdekat" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#panel-masjid")).toBeFocused();
});

test("mosque finder with results, light theme", async ({ page }) => {
  await seedCity(page, JAKARTA, { theme: "light" });
  await page.goto("/?tab=masjid");
  await expect(page.getByRole("link", { name: /^Navigasi ke / }).first()).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test.describe("with the location allowed", () => {
  test.use({ permissions: ["geolocation"], geolocation: { latitude: JAKARTA.lat, longitude: JAKARTA.lng, accuracy: 20 } });

  test("mosque finder with the suggestion form open", async ({ page }) => {
    await seedCity(page, JAKARTA);
    await page.goto("/?tab=masjid");
    await page.getByRole("button", { name: "Tambahkan di sini" }).click();
    await expect(page.getByRole("textbox", { name: "Nama" })).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
});

test("city search with results open", async ({ page }) => {
  await seedCity(page, JAKARTA);
  await page.goto("/");
  await page.getByRole("combobox", { name: "Cari kota" }).fill("band");
  await expect(page.getByRole("option").first()).toBeVisible();
  expect(await violations(page)).toEqual([]);
});
