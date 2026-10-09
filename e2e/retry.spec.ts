import { test, expect, seedCity, countdown, todayCard } from "./fixtures";
import { JAKARTA, timesFor } from "./data.cjs";

// Failed requests are logged by the browser; these tests cause them on purpose
test.use({ allowConsole: /Failed to load resource/ });

test("'Coba Lagi' on the table brings back the table and the countdown @desktop", async ({ page }) => {
  await seedCity(page, JAKARTA);
  let failing = true;
  await page.route("**/api/schedule**", (route) =>
    failing ? route.fulfill({ status: 500, json: { status: false } }) : route.fallback()
  );

  await page.goto("/");
  const retry = page.getByRole("button", { name: /^Coba lagi memuat jadwal/ });
  await expect(retry).toBeVisible();
  await expect(countdown(page).getByText("Jadwal Tidak Tersedia", { exact: true })).toBeVisible();

  failing = false;
  await retry.click();
  await expect(todayCard(page)).toContainText(timesFor(JAKARTA).dzuhur);
  await expect(countdown(page).getByText("Menuju", { exact: false }).first()).toBeVisible();
  await expect(retry).toHaveCount(0);
});

test("going back online retries right away instead of waiting for the next attempt", async ({ page, context }) => {
  await seedCity(page, JAKARTA);
  let failing = true;
  let requests = 0;
  await page.route("**/api/schedule**", (route) => {
    requests++;
    return failing ? route.abort("internetdisconnected") : route.fallback();
  });

  await page.goto("/");
  await expect(countdown(page).getByText("Jadwal Tidak Tersedia", { exact: true })).toBeVisible();
  // The startup load and two countdown retries have failed; the next retry is 10 s away
  await expect.poll(() => requests, { timeout: 10_000 }).toBeGreaterThanOrEqual(3);

  await context.setOffline(true);
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  failing = false;
  await context.setOffline(false);

  await expect(countdown(page).getByText("Jadwal Tidak Tersedia", { exact: true })).toHaveCount(0, { timeout: 3_000 });
  await expect(page.getByText("Offline", { exact: true })).toHaveCount(0);
});
