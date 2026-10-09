// @ts-check
/// <reference lib="webworker" />
// Service worker — enables PWA install and offline use.
// Type-checked with tsconfig.sw.json; tested in src/__tests__/sw.test.ts.
//
// Versioning: the page registers /sw.js?v=<build id>. Every deploy therefore
// installs a new worker with fresh caches, and old ones are deleted on activate.
// A new worker waits until the user accepts the "update available" prompt
// (UpdateToast posts SKIP_WAITING), so a long-open app is never switched mid-use.
//
// Strategies:
//   navigations        network-first (with navigation preload)
//   /_next/static/*    cache-first (file names are content-hashed, never change)
//   /api/schedule      network-first; copies are kept 7 days, at most MAX_API_ENTRIES
//   other /api/*       network only
//   other assets       stale-while-revalidate, capped
// Network-first falls back to the cached copy when offline, when the server answers
// with a 5xx, and when the network takes longer than NETWORK_TIMEOUT_MS.

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const VERSION = new URL(sw.location.href).searchParams.get("v") || "dev";
const PREFIX = "si-imsak-";
const PAGES_CACHE = `${PREFIX}pages-${VERSION}`;
const STATIC_CACHE = `${PREFIX}static-${VERSION}`;
// Schedule data doesn't depend on the app version, so it survives deploys
const API_CACHE = `${PREFIX}api`;
const CURRENT_CACHES = [PAGES_CACHE, STATIC_CACHE, API_CACHE];

// Same TTL as SCHEDULE_CACHE_MAX_AGE in src/lib/constants.ts (localStorage cache)
const API_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const MAX_API_ENTRIES = 48;
const MAX_PAGES_ENTRIES = 60;
const MAX_STATIC_ENTRIES = 200;
const NETWORK_TIMEOUT_MS = 3_500;
const CACHED_AT = "sw-cached-at";

const APP_SHELL = ["/", "/manifest.webmanifest"];

sw.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES_CACHE).then((cache) => cache.addAll(APP_SHELL)));
});

sw.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") sw.skipWaiting();
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Lets the browser start a navigation's request while the worker boots
      await sw.registration.navigationPreload?.enable().catch(() => {});
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith(PREFIX) && !CURRENT_CACHES.includes(k)).map((k) => caches.delete(k))
      );
      await sweepApiCache();
      await sw.clients.claim();
    })()
  );
});

/**
 * Drop the oldest entries once a cache grows past `max`.
 * @param {string} name
 * @param {number} max
 */
async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) {
    await cache.delete(keys[i]);
  }
}

/** @param {Response | undefined} copy */
function isExpired(copy) {
  return !copy || Date.now() - Number(copy.headers.get(CACHED_AT) || 0) >= API_CACHE_MAX_AGE;
}

/** Remove expired schedule copies and cap their number */
async function sweepApiCache() {
  const cache = await caches.open(API_CACHE);
  for (const request of await cache.keys()) {
    if (isExpired(await cache.match(request))) await cache.delete(request);
  }
  await trimCache(API_CACHE, MAX_API_ENTRIES);
}

/** @param {Response} response */
function isNoStore(response) {
  return (response.headers.get("Cache-Control") || "").includes("no-store");
}

/**
 * The network's answer, or null when it takes longer than `ms`.
 * @param {Promise<Response>} network
 * @param {number} ms
 * @returns {Promise<Response | null>}
 */
function within(network, ms) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  /** @type {Promise<null>} */
  const late = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([network, late]).finally(() => clearTimeout(timer));
}

/**
 * Network first, falling back to the cached copy (see the top of this file).
 * A slow answer is still stored when it arrives, so the next visit gets it.
 * @param {FetchEvent} event
 * @param {Promise<Response>} network the request, already sent
 * @param {(response: Response) => Promise<unknown>} store keeps a good answer
 * @param {() => Promise<Response | undefined>} cached the stored copy, if usable
 * @param {() => Promise<Response>} offline the answer when offline without a copy
 * @returns {Promise<Response>}
 */
async function networkFirst(event, network, store, cached, offline) {
  const stored = network.then((response) => (response.ok ? store(response.clone()) : undefined));
  // The worker stays alive until the answer is stored, also when the copy answered first
  event.waitUntil(stored.catch(() => {}));
  try {
    const quick = await within(network, NETWORK_TIMEOUT_MS);
    if (!quick) {
      const copy = await cached();
      if (copy) return copy;
    }
    const response = quick || (await network);
    if (response.status >= 500) return (await cached()) || response;
    return response;
  } catch {
    return (await cached()) || offline();
  }
}

/** @param {FetchEvent} event */
function handleNavigation(event) {
  const url = new URL(event.request.url);
  // Query strings (e.g. ?tab=masjid) don't change the HTML — cache by path
  const key = url.origin + url.pathname;
  const network = Promise.resolve(event.preloadResponse).then((preloaded) => preloaded || fetch(event.request));
  return networkFirst(
    event,
    network,
    async (response) => (await caches.open(PAGES_CACHE)).put(key, response),
    async () => (await caches.open(PAGES_CACHE)).match(key),
    async () => (await (await caches.open(PAGES_CACHE)).match("/")) || Response.error()
  );
}

/** @param {Request} request */
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

/** @param {FetchEvent} event */
function handleSchedule(event) {
  const { request } = event;
  return networkFirst(
    event,
    fetch(request),
    async (response) => {
      // Partial months are sent with no-store — don't keep them offline either
      if (isNoStore(response)) return;
      const headers = new Headers(response.headers);
      headers.set(CACHED_AT, Date.now().toString());
      const body = await response.blob();
      const cache = await caches.open(API_CACHE);
      await cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers }));
      await trimCache(API_CACHE, MAX_API_ENTRIES);
    },
    async () => {
      const cache = await caches.open(API_CACHE);
      const copy = await cache.match(request);
      if (!copy) return undefined;
      if (!isExpired(copy)) return copy;
      await cache.delete(request);
      return undefined;
    },
    async () =>
      new Response(JSON.stringify({ status: false, error: "Offline" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
  );
}

/** @param {Request} request */
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

sw.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Skip external requests (analytics, clarity, etc.)
  if (url.origin !== sw.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(handleStatic(request));
    return;
  }
  if (url.pathname === "/api/schedule") {
    event.respondWith(handleSchedule(event));
    return;
  }
  // Other API routes and the worker itself — network only
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  event.respondWith(handleAsset(request));
});
