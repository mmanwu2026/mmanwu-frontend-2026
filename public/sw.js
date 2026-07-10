// version: 6

// Immediately activate new service worker versions
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// REQUIRED: Fetch handler (even empty) so iOS + Edge allow PWA installation
self.addEventListener("fetch", () => {});

// ⭐ PUSH HANDLER — Web Push Incoming Call Support
self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    console.error("Push JSON parse error:", err);
    return;
  }

  const title = payload.title || "New Message";
  const body = payload.body || "";
  const data = payload.data || {};

  const options = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    data, // ensures click routing receives the URL
    vibrate: [200, 100, 200],
    actions: [
      {
        action: "open",
        title: "Open",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// REQUIRED FOR UPDATE BANNER
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ⭐ NOTIFICATION CLICK ROUTING — Incoming Call Deep Link
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