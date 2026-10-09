import { test, expect } from "@playwright/test";

// Daily against production (synthetic.yml), where the real Clarity and Vercel scripts
// load: a CSP that blocks them, or any console error, fails this test. Their beacons
// are answered here, so the monitor never shows up in the analytics.
test.skip(!process.env.E2E_BASE_URL, "runs against a deployed site only");

const JAKARTA = { id: "58a2fc6ed39fd083f55d4182bf88826d", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA" };

test("the live site loads its schedule and third-party scripts without errors", async ({ page }) => {
  test.setTimeout(60_000);
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`console.error: ${msg.text()} (${msg.location().url})`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  const loaded: string[] = [];
  page.on("response", (res) => loaded.push(res.url()));
  await page.addInitScript((city) => {
    document.addEventListener("securitypolicyviolation", (event) => {
      const w = window as unknown as { __cspViolations?: string[] };
      (w.__cspViolations ??= []).push(`${event.violatedDirective} ${event.blockedURI}`);
    });
    localStorage.setItem("selectedLocation", JSON.stringify(city));
    localStorage.setItem("pwa-install-dismissed", "1");
  }, JAKARTA);
  await page.route(/\.clarity\.ms\/collect|\/_vercel\/(insights|speed-insights)\/(view|event|vitals)/, (route) =>
    route.fulfill({ status: 204 })
  );

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("region", { name: "Jadwal sholat hari ini" })).toContainText(/\d{2}:\d{2}/);

  // Clarity's loader runs once the page is idle; it then fetches clarity.js
  if ((await response!.text()).includes("clarity.ms/tag/")) {
    await expect
      .poll(() => loaded.some((url) => url.startsWith("https://scripts.clarity.ms/")), { timeout: 30_000 })
      .toBe(true);
  } else {
    test.info().annotations.push({ type: "note", description: "Clarity isn't configured on this deployment" });
  }
  // Let the analytics scripts start and send their first beacons
  await page.waitForTimeout(3_000);

  const csp = await page.evaluate(() => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? []);
  expect([...problems, ...csp.map((v) => `csp: ${v}`)], "console errors, page errors and CSP violations").toEqual([]);
});
