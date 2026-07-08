// version: 5

// Immediately activate new service worker versions
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// REQUIRED: Fetch handler (even empty) so Edge allows push subscription
// IMPORTANT: Do NOT intercept or modify requests.
self.addEventListener("fetch", () => {});

// REQUIRED: Push handler
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title || "New Message", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: data, // IMPORTANT: ensures click routing receives the URL
    })
  );
});

// ⭐ REQUIRED FOR UPDATE BANNER
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ⭐ ⭐ ⭐ Notification Click Routing (FINAL VERSION)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If app is already open → focus + navigate
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }

      // Otherwise open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
