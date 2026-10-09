import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build (`npm run e2e:build`) served by
// `next start`, with every upstream service replaced by e2e/mock-upstream.mjs.
const PORT = 3100;
const MOCK_PORT = 3101;
const MOCK = `http://127.0.0.1:${MOCK_PORT}`;

// The screenshot comparison (visual.yml) serves the base and head builds itself
const externalBaseUrl = process.env.E2E_BASE_URL;
// A Chromium that is already installed (e.g. in a sandbox without browser downloads)
const chromiumPath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseUrl ?? `http://127.0.0.1:${PORT}`,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: [/offline-sw/, /visual/] },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      grep: /@desktop/,
      testIgnore: [/offline-sw/, /visual/],
    },
    { name: "sw", use: { ...devices["Pixel 7"], serviceWorkers: "allow" }, testMatch: /offline-sw/ },
    { name: "visual", testMatch: /visual\.spec/, retries: 0 },
  ],
  webServer: externalBaseUrl
    ? undefined
    : [
        {
          command: "node e2e/mock-upstream.mjs",
          port: MOCK_PORT,
          reuseExistingServer: !process.env.CI,
        },
        {
          command: `npx next start -p ${PORT}`,
          port: PORT,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            MYQURAN_API_BASE: `${MOCK}/myquran`,
            NOMINATIM_REVERSE_URL: `${MOCK}/nominatim/reverse`,
            OVERPASS_ENDPOINTS: `${MOCK}/overpass/interpreter`,
          },
        },
      ],
});
