import type { NextConfig } from "next";

// One timestamp per build, shared by the server and client bundles: the store uses it
// as "now" for the prerendered first render, and the service worker URL carries the
// build id so each deploy installs a fresh worker and cache.
// next.config is evaluated by several build processes; storing the value in the
// environment lets the child processes (which inherit it) reuse the same timestamp.
process.env.SI_IMSAK_BUILD_TIME ||= String(Date.now());
const BUILD_TIME = process.env.SI_IMSAK_BUILD_TIME;
const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA || BUILD_TIME).slice(0, 12);

// One directive per line here; sent as a single header
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // 'unsafe-inline': Next.js's inline bootstrap scripts (nonces would make the page dynamic)
  "script-src 'self' 'unsafe-inline' https://*.clarity.ms https://va.vercel-scripts.com",
  // No inline event handler attributes (onclick="…")
  "script-src-attr 'none'",
  "connect-src 'self' https://*.clarity.ms https://vitals.vercel-insights.com",
  "img-src 'self' data: blob: https://*.clarity.ms",
  "style-src 'self' 'unsafe-inline'",
  // next/font serves the fonts from this origin
  "font-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // The app has no next/image usage — turn the on-demand image optimizer
  // endpoint off instead of leaving it as unused attack surface.
  images: { unoptimized: true },
  poweredByHeader: false,
  // The mosque dataset, read at run time by /api/mosques (src/lib/mosque-index.ts)
  outputFileTracingIncludes: {
    "/api/mosques": ["./data/mosques.tsv", "./data/mosques.meta.json"],
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: BUILD_TIME,
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), browsing-topics=(), geolocation=(self)",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
          // Which deploy answered — for bug reports and the synthetic monitor
          { key: "X-App-Version", value: BUILD_ID },
        ],
      },
      {
        // API responses are for this site's pages only
        source: "/api/:path*",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "same-origin" }],
      },
    ];
  },
};

export default nextConfig;
