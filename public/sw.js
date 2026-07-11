// version: 7

// Immediately activate new service worker versions
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// REQUIRED: Fetch handler (even empty) so iOS + Edge allow PWA installation
self.addEventListener("fetch", () => {});

// ⭐ PUSH HANDLER — Incoming Call Support
self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    console.error("Push JSON parse error:", err);
    return;
  }

  const title = payload.title || "Incoming Call";
  const body = payload.body || "Tap to join the call";
  const data = payload.data || {};

  const options = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    data, // contains url + roomId + callerId
    vibrate: [200, 100, 200],
    actions: [
      { action: "join", title: "Join Call" },
      { action: "decline", title: "Decline" }
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

// ⭐ NOTIFICATION CLICK ROUTING — Deep Link to Call Screen
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.focus();
        client.navigate(url);
        return;
      }

      return self.clients.openWindow(url);
    })
  );
});
