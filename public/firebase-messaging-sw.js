/* global importScripts, firebase */

importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAwfuss2PPc6rG3MJljxZFJ5ZuzC9L4KHI",
  authDomain: "mman-plaza.firebaseapp.com",
  projectId: "mman-plaza",
  storageBucket: "mman-plaza.firebasestorage.app",
  messagingSenderId: "328867796060",
  appId: "1:328867796060:web:af1fd5cc070d3097084299",
});

const messaging = firebase.messaging();

/**
 * Handles background push messages from FCM HTTP v1.
 * This is triggered even when the PWA is minimized or backgrounded.
 */
messaging.onBackgroundMessage((payload) => {
  console.log("[Service Worker] Background message received:", payload);

  const title =
    payload.notification?.title ||
    payload.data?.caller_name ||
    "Incoming Call";

  const body =
    payload.notification?.body ||
    `${payload.data?.caller_name || "Someone"} is calling you…`;

  const roomId = payload.data?.room_id;

  const notificationOptions = {
    body,
    icon: "/icons/call-large.png",
    badge: "/icons/badge-72.png",
    requireInteraction: true, // ⭐ Keeps notification visible
    data: {
      room_id: roomId,
      caller_name: payload.data?.caller_name,
      url: roomId ? `/call/${roomId}?role=callee` : "/",
    },
  };

  self.registration.showNotification(title, notificationOptions);
});

/**
 * Handles notification click → opens call room reliably.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  console.log("[Service Worker] Notification click → navigating to:", url);

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus + navigate
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
