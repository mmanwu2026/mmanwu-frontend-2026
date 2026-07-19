// ⭐ Version your cache
const CACHE_NAME = "mmanplaza-v1";

// ⭐ Files you want cached (optional)
const ASSETS_TO_CACHE = [
  "/",
  "/favicon.ico",
  "/manifest.json"
];

// ⭐ Install event — cache assets + force immediate activation
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );

  // ⭐ Critical: activate new SW immediately
  self.skipWaiting();
});

// ⭐ Activate event — clean old caches + take over all tabs
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // ⭐ Delete old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );

      // ⭐ Critical: take control of ALL open tabs immediately
      await self.clients.claim();

      // ⭐ Notify all tabs that a new version is available
      const clients = await self.clients.matchAll();
      clients.forEach((client) =>
        client.postMessage({ type: "sw-update" })
      );
    })()
  );
});

// ⭐ Fetch event — stale-while-revalidate caching
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // ⭐ Do NOT cache POST, PUT, PATCH, DELETE, OPTIONS
  if (req.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);

      const networkFetch = fetch(req)
        .then((response) => {
          // Clone BEFORE using
          const responseClone = response.clone();
          cache.put(req, responseClone);
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

// ⭐ Listen for SKIP_WAITING from UpdateBanner
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
