// Service worker — enables PWA install and offline use.
//
// Versioning: the page registers /sw.js?v=<build id>. Every deploy therefore
// installs a new worker with fresh caches, and old ones are deleted on activate.
// A new worker waits until the user accepts the "update available" prompt
// (UpdateToast posts SKIP_WAITING), so a long-open app is never switched mid-use.
//
// Strategies:
//   navigations        network-first, cached copy when offline
//   /_next/static/*    cache-first (file names are content-hashed, never change)
//   /api/schedule      network-first, cached copy (max 7 days) when offline
//   other /api/*       network only
//   other assets       stale-while-revalidate, capped

const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const PREFIX = "si-imsak-";
const PAGES_CACHE = `${PREFIX}pages-${VERSION}`;
const STATIC_CACHE = `${PREFIX}static-${VERSION}`;
// Schedule data doesn't depend on the app version, so it survives deploys
const API_CACHE = `${PREFIX}api`;
const CURRENT_CACHES = [PAGES_CACHE, STATIC_CACHE, API_CACHE];

// Same TTL as SCHEDULE_CACHE_MAX_AGE in src/lib/constants.ts (localStorage cache)
const API_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const MAX_PAGES_ENTRIES = 60;
const MAX_STATIC_ENTRIES = 200;

const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES_CACHE).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(PREFIX) && !CURRENT_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Drop the oldest entries once a cache grows past `max`. */
async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) {
    await cache.delete(keys[i]);
  }
}

function isNoStore(response) {
  return (response.headers.get("Cache-Control") || "").includes("no-store");
}

async function handleNavigation(request) {
  const url = new URL(request.url);
  // Query strings (e.g. ?tab=masjid) don't change the HTML — cache by path
  const key = url.origin + url.pathname;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGES_CACHE);
      await cache.put(key, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(PAGES_CACHE);
    return (await cache.match(key)) || (await cache.match("/")) || Response.error();
  }
}

async function handleStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES);
  }
  return response;
}

async function handleSchedule(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    // Partial months are sent with no-store — don't keep them offline either
    if (response.ok && !isNoStore(response)) {
      const headers = new Headers(response.headers);
      headers.set("sw-cached-at", Date.now().toString());
      const body = await response.clone().blob();
      await cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers }));
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const cachedAt = Number(cached.headers.get("sw-cached-at") || 0);
      if (Date.now() - cachedAt < API_CACHE_MAX_AGE) return cached;
      await cache.delete(request);
    }
    return new Response(JSON.stringify({ status: false, error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleAsset(request) {
  const cache = await caches.open(PAGES_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok && !isNoStore(response)) {
        await cache.put(request, response.clone());
        trimCache(PAGES_CACHE, MAX_PAGES_ENTRIES);
      }
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Skip external requests (analytics, clarity, etc.)
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(handleStatic(request));
    return;
  }
  if (url.pathname === "/api/schedule") {
    event.respondWith(handleSchedule(request));
    return;
  }
  // Other API routes and the worker itself — network only
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  event.respondWith(handleAsset(request));
});
