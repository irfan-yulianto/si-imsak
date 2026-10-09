import { test, expect } from "@playwright/test";

// Plain HTTP checks; no browser page involved
test("pages carry the security headers and no framework banner", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
  const headers = res.headers();
  expect(headers["x-powered-by"]).toBeUndefined();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["permissions-policy"]).toContain("geolocation=(self)");
  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
  expect(headers["x-app-version"]).toMatch(/^\w+$/);

  const csp = headers["content-security-policy"];
  expect(csp).toContain("script-src-attr 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("font-src 'self'");
  expect(csp).not.toContain("fonts.gstatic.com");
});

test("API responses can't be embedded by other sites", async ({ request }) => {
  const res = await request.get("/api/time");
  expect(res.headers()["cross-origin-resource-policy"]).toBe("same-origin");
  expect(res.headers()["cache-control"]).toBe("no-store");
});
