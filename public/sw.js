// ⭐ Version your cache
const CACHE_NAME = "mmanplaza-v1";

// ⭐ Files you want cached (optional)
const ASSETS_TO_CACHE = [
  "/",
  "/favicon.ico",
  "/manifest.json",
];

// ⭐ Install event — cache assets + force immediate activation
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );

  self.skipWaiting();
});

// ⭐ Activate event — clean old caches + take over all tabs
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );

      await self.clients.claim();

      const clientsList = await self.clients.matchAll();
      clientsList.forEach((client) =>
        client.postMessage({ type: "sw-update" })
      );
    })()
  );
});

// ⭐ Fetch event — stale-while-revalidate caching
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin.includes("supabase.co")) {
    return;
  }

  if (req.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);

      const networkFetch = fetch(req)
        .then((response) => {
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

/* -----------------------------------------------------------
   ⭐ WEBPUSH HANDLER — EXACTLY MATCHES FIREBASE PAYLOAD SHAPE
   ----------------------------------------------------------- */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (err) {
    console.log("[SW] Push JSON parse error:", err);
  }

  /* ⭐ INCOMING CALL — replicate Firebase payload structure */
  if (data.event === "incoming_call") {
    const title =
      data.title ||
      data.caller_name ||
      "Incoming Call";

    const body =
      data.body ||
      `${data.caller_name || "Someone"} is calling you…`;

    const roomId = data.room_id;

    const notificationOptions = {
      body,
      icon: "/icons/call-large.png",
      badge: "/icons/badge-72.png",
      requireInteraction: true,
      renotify: true,
      tag: "incoming-call",
      data: {
        room_id: roomId,
        caller_name: data.caller_name,
        url: roomId ? `/call/${roomId}?role=callee` : "/",
      },
    };

    event.waitUntil(self.registration.showNotification(title, notificationOptions));
    return;
  }

  /* ⭐ DM Notification */
  if (data.event === "dm") {
    const notificationOptions = {
      body: data.body,
      icon: "/icons/badge-72.png",
      data: {
        url: `/messenger/${data.dm_room_id}`,
      },
    };

    event.waitUntil(self.registration.showNotification(data.title, notificationOptions));
    return;
  }

  /* ⭐ Default fallback */
  event.waitUntil(
    self.registration.showNotification(data.title || "Notification", {
      body: data.body || "",
    })
  );
});

/* -----------------------------------------------------------
   ⭐ Notification Click → Navigate to correct screen
   ----------------------------------------------------------- */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.navigate(url);
        return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
