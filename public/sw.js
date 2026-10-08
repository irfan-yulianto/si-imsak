// Service worker — enables PWA install, caches app shell + API responses for offline use.

const CACHE_VERSION = "v3";
const CACHE_NAME = `si-imsak-${CACHE_VERSION}`;
const API_CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// App shell — pre-cached on install for offline access
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip external requests (analytics, clarity, etc.)
  if (url.origin !== self.location.origin) return;

  // API schedule responses — network-first, cache fallback with TTL
  if (url.pathname === "/api/schedule") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Partial months are sent with no-store — don't keep them offline either
          const noStore = (response.headers.get("Cache-Control") || "").includes("no-store");
          if (response.ok && !noStore) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              const headers = new Headers(clone.headers);
              headers.set("sw-cached-at", Date.now().toString());
              const cachedResponse = new Response(clone.body, {
                status: clone.status,
                statusText: clone.statusText,
                headers,
              });
              cache.put(event.request, cachedResponse);
            });
          }
          return response;
        })
        .catch(() =>
          caches.open(CACHE_NAME).then((cache) =>
            cache.match(event.request).then((cached) => {
              if (cached) {
                const cachedAt = Number(
                  cached.headers.get("sw-cached-at") || 0
                );
                if (Date.now() - cachedAt < API_CACHE_MAX_AGE) {
                  return cached;
                }
                cache.delete(event.request);
              }
              return new Response(
                JSON.stringify({ status: false, error: "Offline" }),
                {
                  status: 503,
                  headers: { "Content-Type": "application/json" },
                }
              );
            })
          )
        )
    );
    return;
  }

  // Other API routes — network-only (geocode, mosques)
  if (url.pathname.startsWith("/api/")) return;

  // Static assets & pages — stale-while-revalidate
  // Serve from cache immediately, update cache in background
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Offline fallback: if not in cache, try serving the app shell
            if (event.request.mode === "navigate") {
              return cache.match("/");
            }
            return undefined;
          });

        // Return cached version immediately, or wait for network
        return cached || fetchPromise;
      })
    )
  );
});
