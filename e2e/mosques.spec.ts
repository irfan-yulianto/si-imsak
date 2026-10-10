import { test, expect, pauseClock, seedCity } from "./fixtures";
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
  await expect(page.getByRole("link", { name: /^Navigasi ke / })).toHaveCount(9);
  // A place a user suggested, approved by hand, says so
  await expect(page.getByRole("listitem").filter({ hasText: "Musholla Usulan Warga" }).getByText("Usulan pengguna")).toBeVisible();
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
  // From a position only known to 400 m, the distances are rough
  await expect(page.getByRole("listitem").first().getByText(/^~\d+ m$/)).toBeVisible();
  await expect(page.getByText(/Jarak hanya kira-kira: diukur dalam garis lurus dari posisi ±400 m\./)).toBeVisible();

  // A sharper fix ~630 m north-east, closest to the second mosque
  await context.setGeolocation({ latitude: JAKARTA.lat + 0.004, longitude: JAKARTA.lng + 0.004, accuracy: 15 });
  await expect(nearest).toHaveText("Masjid Uji 2");
  await expect(page.getByText("GPS akurat ±15m")).toBeVisible();
  await expect(page.getByRole("listitem").first().getByText(/^\d+ m$/)).toBeVisible();
  await expect(page.getByText(/^Jarak diukur dalam garis lurus\./)).toBeVisible();
  expect(searches).toHaveLength(1);
});

test.describe("at a mosque's gate", () => {
  // 22 m south of Masjid Uji 8's wall (67 m from the middle of its outline), from a sharp fix
  test.use({ geolocation: { latitude: JAKARTA.lat - 0.0004 - 22 / 111_195, longitude: JAKARTA.lng + 0.004, accuracy: 10 } });

  test("says the user is at the mosque, measured to its wall", async ({ page }) => {
    await seedCity(page, JAKARTA);
    await page.goto("/?tab=masjid");
    const first = page.getByRole("listitem").first();
    await expect(first.getByRole("heading")).toHaveText("Masjid Uji 8");
    await expect(first.getByText("Di lokasi Anda")).toBeVisible();
    await expect(page.getByText("GPS akurat ±10m")).toBeVisible();
  });
});

test.describe("allowed only the approximate location", () => {
  // What Android gives a browser allowed only the approximate location: exactly 2 km
  test.use({ geolocation: { latitude: JAKARTA.lat, longitude: JAKARTA.lng, accuracy: 2000 } });

  test("says the distances are rough, and after a minute how to allow the accurate location", async ({ page }) => {
    await page.clock.install();
    await seedCity(page, JAKARTA);
    await page.goto("/?tab=masjid");
    await expect(page.getByRole("listitem").getByRole("heading").first()).toHaveText("Masjid Uji 1");
    await expect(page.getByText("Akurasi rendah ±2000m")).toBeVisible();
    await expect(page.getByRole("listitem").first().getByText(/^≤ \d+(\.\d)? km$/)).toBeVisible();
    await expect(page.getByText(/Jarak hanya kira-kira: diukur dalam garis lurus dari posisi ±2 km\./)).toBeVisible();
    await expect(page.getByText(/lokasi perkiraan/)).toHaveCount(0);

    // The GPS gets a minute to do better; then the fix is as good as it gets
    await pauseClock(page);
    await page.clock.runFor(61_000);
    const hint = page.getByText(/^Browser hanya mendapat lokasi perkiraan/);
    await expect(hint).toBeVisible();
    // The mobile project is a Pixel 7: Android's own setting
    await expect(hint).toContainText('aktifkan "Gunakan lokasi akurat"');
    await expect(page.getByRole("button", { name: "Perbarui Lokasi GPS" })).toBeVisible();
  });
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
