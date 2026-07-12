// version: 9

// Immediately activate new service worker versions
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// REQUIRED: Fetch handler (even empty) so iOS + Edge allow PWA installation
self.addEventListener("fetch", () => {});

// ⭐ PUSH HANDLER — Incoming Call Notification
self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    console.error("Push JSON parse error:", err);
    return;
  }

  const data = payload.data || {};

  // Correct camelCase fields (matches sendPush.ts)
  const callerName = data.callerName || "Incoming Caller";
  const roomId = data.roomId;

  // Deep link fallback
  const url =
    data.url ||
    (roomId ? `/call/${roomId}?role=callee` : "/messenger");

  const title = `📞 Incoming Call from ${callerName}`;

  const options = {
    body: "Tap to answer the call",
    icon: "/icons/call-large.png",
    badge: "/icons/badge-72.png",
    vibrate: [300, 150, 300, 150, 300],
    requireInteraction: true,
    data: {
      url,
      roomId,
      callerName,
    },
    actions: [
      {
        action: "answer",
        title: "Answer",
        icon: "/icons/answer.png",
      },
      {
        action: "decline",
        title: "Decline",
        icon: "/icons/decline.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ⭐ REQUIRED FOR UPDATE BANNER + KEEP_ALIVE
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "KEEP_ALIVE") {
    // No-op: keeps SW alive on mobile
  }
});

// ⭐ NOTIFICATION CLICK ROUTING — Deep Link to Call Screen
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/messenger";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          client.focus();
          client.navigate(url);
          return;
        }

        return self.clients.openWindow(url);
      })
  );
});
