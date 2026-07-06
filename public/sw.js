self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => clients.claim());

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const payload = event.data.json();

  event.waitUntil(
    self.registration.showNotification(payload.title || "Mman Plaza", {
      body: payload.body || "New activity in Mman Plaza",
      icon: payload.icon || "/icons/mman-192.png",
      badge: "/icons/mman-192.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || "/";

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
