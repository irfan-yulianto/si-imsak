import { test, expect, seedCity, todayCard } from "./fixtures";
import { JAKARTA, timesFor } from "./data.cjs";

// Reports the cumulative layout shift of a load. The 0.02 target is enforced once the
// layout work lands; until then only shifts in Google's "poor" range (≥ 0.25) fail.
for (const visit of ["returning", "first"] as const) {
  test(`layout shift on a ${visit} visit @desktop`, async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) w.__cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    if (visit === "returning") await seedCity(page, JAKARTA);
    await page.goto("/");
    await expect(todayCard(page)).toContainText(timesFor(JAKARTA).dzuhur);
    await page.waitForTimeout(1_000);

    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    testInfo.annotations.push({ type: "CLS", description: cls.toFixed(4) });
    console.log(`CLS [${testInfo.project.name}, ${visit} visit]: ${cls.toFixed(4)}`);
    expect(cls).toBeLessThan(0.25);
  });
}
