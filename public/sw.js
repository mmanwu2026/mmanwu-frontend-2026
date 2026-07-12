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

// ⭐ PUSH HANDLER — Improved Incoming Call Notification
self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    console.error("Push JSON parse error:", err);
    return;
  }

  const data = payload.data || {};

  // ⭐ Ignore non-incoming_call events (prevents call_started hijacking)
  if (data.event_type && data.event_type !== "incoming_call") {
    console.log("SW DEBUG → ignoring non-incoming_call push event");
    return;
  }

  const callerName = data.caller_name || payload.callerName || "Incoming Caller";
  const roomId = data.room_id || data.roomId;

  // 🔑 Force callee role in the deep link
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
      event_type: "incoming_call", // ⭐ reinforce type
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

// REQUIRED FOR UPDATE BANNER
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ⭐ NOTIFICATION CLICK ROUTING — Deep Link to Call Screen
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};

  // ⭐ Ignore non-incoming_call clicks
  if (data.event_type && data.event_type !== "incoming_call") {
    console.log("SW DEBUG → ignoring non-incoming_call click");
    return;
  }

  const roomId = data.roomId || data.room_id;
  const url =
    data.url ||
    (roomId ? `/call/${roomId}?role=callee` : "/messenger");

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
