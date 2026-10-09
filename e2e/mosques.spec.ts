import { test, expect, seedCity } from "./fixtures";
import { JAKARTA } from "./data.cjs";

test.use({
  permissions: ["geolocation"],
  geolocation: { latitude: JAKARTA.lat, longitude: JAKARTA.lng, accuracy: 20 },
});

test("finds mosques around the GPS position and widens the search @desktop", async ({ page, isMobile }) => {
  await seedCity(page, JAKARTA);
  await page.goto("/");
  if (isMobile) await page.getByRole("tab", { name: "Masjid" }).click();
  else await page.locator("#panel-masjid").scrollIntoViewIfNeeded();

  const radius2k = page.waitForRequest((r) => r.url().includes("/api/mosques") && r.url().includes("radius=2000"));
  await page.getByRole("button", { name: "Gunakan Lokasi GPS" }).click();
  await radius2k;
  await expect(page.getByRole("heading", { name: "Masjid Uji 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Navigasi ke / })).toHaveCount(3);

  const radius4k = page.waitForRequest((r) => r.url().includes("/api/mosques") && r.url().includes("radius=4000"));
  await page.getByRole("button", { name: /Perluas Pencarian \(2 km → 4 km\)/ }).click();
  await radius4k;
  await expect(page.getByRole("link", { name: /^Navigasi ke / })).toHaveCount(7);

  // "Muat Ulang" keeps the wider radius
  const reload4k = page.waitForRequest((r) => r.url().includes("/api/mosques") && r.url().includes("radius=4000"));
  await page.getByRole("button", { name: "Muat ulang daftar masjid" }).click();
  await reload4k;
});

test("keeps the position and the results out of Clarity recordings", async ({ page }) => {
  await seedCity(page, JAKARTA);
  await page.goto("/?tab=masjid");
  await page.getByRole("button", { name: "Gunakan Lokasi GPS" }).click();
  await expect(page.getByRole("heading", { name: "Masjid Uji 1" })).toBeVisible();

  const masked = '[data-clarity-mask="True"]';
  await expect(page.getByRole("heading", { name: "Masjid Uji 1" }).locator(`xpath=ancestor::*[@data-clarity-mask="True"]`)).toHaveCount(1);
  await expect(page.getByText("Lokasi GPS Anda", { exact: true }).locator("xpath=ancestor-or-self::*[@data-clarity-mask='True']")).toHaveCount(1);
  await expect(page.locator(masked).getByRole("combobox", { name: "Cari kota untuk lokasi masjid" })).toHaveCount(1);
});
