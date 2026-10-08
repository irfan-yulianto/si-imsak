import type { NextConfig } from "next";

// One timestamp per build, shared by the server and client bundles: the store uses it
// as "now" for the prerendered first render, and the service worker URL carries the
// build id so each deploy installs a fresh worker and cache.
// next.config is evaluated by several build processes; storing the value in the
// environment lets the child processes (which inherit it) reuse the same timestamp.
process.env.SI_IMSAK_BUILD_TIME ||= String(Date.now());
const BUILD_TIME = process.env.SI_IMSAK_BUILD_TIME;
const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA || BUILD_TIME).slice(0, 12);

const nextConfig: NextConfig = {
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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.clarity.ms https://va.vercel-scripts.com; connect-src 'self' https://*.clarity.ms https://vitals.vercel-insights.com; img-src 'self' data: blob: https://*.clarity.ms; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; worker-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';" },
        ],
      },
    ];
  },
};

export default nextConfig;
