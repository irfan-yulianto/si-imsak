import { test, expect, countdown } from "./fixtures";
import { BANDUNG } from "./data.cjs";

const prompt = (page: import("@playwright/test").Page) => page.getByRole("dialog", { name: /Gunakan lokasi Anda/ });

test.describe("with location permission", () => {
  test.use({
    permissions: ["geolocation"],
    geolocation: { latitude: BANDUNG.lat, longitude: BANDUNG.lng },
  });

  test("a first visit can pick the city from the GPS position @desktop", async ({ page }) => {
    await page.goto("/");
    await expect(prompt(page)).toBeVisible();
    await prompt(page).getByRole("button", { name: "Gunakan Lokasi" }).click();

    // Nominatim says "Kota Bandung"; of KOTA BANDUNG and KAB. BANDUNG the exact name wins
    await expect(countdown(page)).toContainText("KOTA BANDUNG");
    await expect(prompt(page)).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("selectedLocation") ?? "{}").id)).toBe(BANDUNG.id);
  });
});

test("explains a refused location permission and keeps the prompt open", async ({ page }) => {
  await page.goto("/");
  await prompt(page).getByRole("button", { name: "Gunakan Lokasi" }).click();
  await expect(prompt(page).getByRole("alert")).toHaveText(/Izin lokasi ditolak/);
  await expect(prompt(page).getByRole("button", { name: "Tutup" })).toBeVisible();
});

test("the city search finds and selects a city", async ({ page }) => {
  await page.goto("/");
  await prompt(page).getByRole("button", { name: "Nanti" }).click();
  await page.getByRole("combobox", { name: "Cari kota" }).fill("band");
  await page.getByRole("option", { name: "KAB. BANDUNG" }).click();
  await expect(countdown(page)).toContainText("KAB. BANDUNG");
});
