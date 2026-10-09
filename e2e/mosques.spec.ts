import { test, expect, seedCity } from "./fixtures";
import { JAKARTA } from "./data.cjs";

// The site may read the location (as for a returning visitor who allowed it)
test.use({
  permissions: ["geolocation"],
  geolocation: { latitude: JAKARTA.lat, longitude: JAKARTA.lng, accuracy: 20 },
});

test("finds the mosques around the GPS position by itself @desktop", async ({ page, isMobile }) => {
  await seedCity(page, JAKARTA);
  // The position rounded to ~1 km, and no radius: the server decides how far to look
  const search = page.waitForRequest((r) => r.url().includes("/api/mosques?lat=-6.18&lng=106.83"));
  await page.goto("/");
  if (isMobile) await page.getByRole("tab", { name: "Masjid" }).click();
  else await page.locator("#panel-masjid").scrollIntoViewIfNeeded();

  // No button to press: the location is allowed already
  const response = await (await search).response();
  expect(response?.headers()["x-data-date"]).toBe("2026-10-06");
  await expect(page.getByRole("listitem").getByRole("heading").first()).toHaveText("Masjid Uji 1");
  await expect(page.getByText("Lokasi GPS Anda", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Navigasi ke / })).toHaveCount(7);
  await expect(page.getByRole("listitem").filter({ hasText: "Jalan Uji 3" }).getByText("Musholla", { exact: true })).toBeVisible();

  const again = page.waitForRequest((r) => r.url().includes("/api/mosques"));
  await page.getByRole("button", { name: "Muat ulang daftar masjid" }).click();
  await again;
});

test("orders the results again as the GPS position sharpens, without asking the server again", async ({ page, context }) => {
  await context.setGeolocation({ latitude: JAKARTA.lat, longitude: JAKARTA.lng, accuracy: 400 });
  await seedCity(page, JAKARTA);
  const searches: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/mosques")) searches.push(r.url());
  });
  await page.goto("/?tab=masjid");
  const nearest = page.getByRole("listitem").getByRole("heading").first();
  await expect(nearest).toHaveText("Masjid Uji 1");

  // A sharper fix ~630 m north-east, closest to the second mosque
  await context.setGeolocation({ latitude: JAKARTA.lat + 0.004, longitude: JAKARTA.lng + 0.004, accuracy: 15 });
  await expect(nearest).toHaveText("Masjid Uji 2");
  await expect(page.getByText("GPS akurat ±15m")).toBeVisible();
  expect(searches).toHaveLength(1);
});

test("keeps the position, the results and the links out of Clarity recordings", async ({ page }) => {
  await seedCity(page, JAKARTA);
  await page.goto("/?tab=masjid");
  await expect(page.getByRole("heading", { name: "Masjid Uji 1" })).toBeVisible();

  const masked = '[data-clarity-mask="True"]';
  await expect(page.getByRole("heading", { name: "Masjid Uji 1" }).locator(`xpath=ancestor::*[@data-clarity-mask="True"]`)).toHaveCount(1);
  await expect(page.getByText("Lokasi GPS Anda", { exact: true }).locator("xpath=ancestor-or-self::*[@data-clarity-mask='True']")).toHaveCount(1);
  await expect(page.locator(masked).getByRole("combobox", { name: "Cari kota untuk lokasi masjid" })).toHaveCount(1);
  await expect(page.locator(masked).getByRole("link", { name: /Cari lebih banyak di Google Maps/ })).toHaveCount(1);
});

test.describe("before the location is allowed", () => {
  test.use({ permissions: [] });

  test("searches around the city's centre, and says it isn't the user's position", async ({ page }) => {
    await seedCity(page, JAKARTA);
    await page.goto("/?tab=masjid");
    await expect(page.getByRole("heading", { name: "Masjid Uji 1" })).toBeVisible();
    await expect(page.getByText("Sekitar pusat KOTA JAKARTA, bukan lokasi Anda")).toBeVisible();
    await expect(page.getByRole("button", { name: "Gunakan Lokasi GPS" })).toBeVisible();
    await expect(page.getByRole("link", { name: "kontributor OpenStreetMap (buka di tab baru)" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Overture Maps Foundation (buka di tab baru)" })).toBeVisible();
  });
});
