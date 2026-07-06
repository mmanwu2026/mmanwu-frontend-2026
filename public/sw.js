// Install immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate immediately
self.addEventListener("activate", (event) => {
  clients.claim();
});

// Handle incoming push messages
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const payload = event.data.json();

  const title = payload.title || "Mman Plaza";
  const body = payload.body || "New activity in Mman Plaza";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/mman-192.png",
      badge: "/icons/mman-192.png",
      data: payload.data || {},
    })
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
