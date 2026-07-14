/* global self, clients */

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};

  event.waitUntil(
    self.registration.showNotification("Incoming Call", {
      body: `${data.caller_name} is calling you`,
      data: data.data,
      icon: "/icons/call.png",
      badge: "/icons/badge.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const roomId = event.notification.data?.room_id;

  event.waitUntil(
    clients.openWindow(`/call/${roomId}?role=callee`)
  );
});
