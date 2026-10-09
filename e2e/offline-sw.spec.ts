import { test, expect, seedCity, todayCard } from "./fixtures";
import { JAKARTA, timesFor } from "./data.cjs";

// Requests that fail while offline are logged by the browser. The worker also fetches
// the Vercel Analytics scripts itself (out of page.route's reach); they only exist on Vercel.
test.use({ allowConsole: /Failed to load resource|ERR_INTERNET_DISCONNECTED|\/_vercel\// });

test("keeps working offline from the service worker's caches", async ({ page, context }) => {
  await seedCity(page, JAKARTA);
  await page.goto("/");
  await expect(todayCard(page)).toContainText(timesFor(JAKARTA).dzuhur);

  // The worker claims the page once it activates; one more online load fills its caches
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 15_000 });
  await page.reload();
  await expect(todayCard(page)).toContainText(timesFor(JAKARTA).dzuhur);

  await context.setOffline(true);
  await page.reload();
  await expect(todayCard(page)).toContainText(timesFor(JAKARTA).dzuhur);
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
});
