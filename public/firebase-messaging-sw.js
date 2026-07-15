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
 * ⭐ KEEP‑ALIVE HANDLER
 * Prevents service worker from being killed by mobile browsers.
 */
self.addEventListener("push", (event) => {
  try {
    const data = event.data?.json();

    if (data?.type === "keepalive") {
      console.log("[SW] Keepalive ping received");
      return; // Do NOT show a notification
    }
  } catch (err) {
    console.log("[SW] Keepalive parse error:", err);
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "keepalive-sync") {
    console.log("[SW] Background sync triggered");
    event.waitUntil(fetch("/api/pwa-sync-ping").catch(() => {}));
  }
});

/**
 * MAIN: Incoming call notifications
 */
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message:", payload);

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
    requireInteraction: true,
    renotify: true,
    tag: "incoming-call",
    data: {
      room_id: roomId,
      caller_name: payload.data?.caller_name,
      url: roomId ? `/call/${roomId}?role=callee` : "/",
    },
  };

  self.registration.showNotification(title, notificationOptions);
});

/**
 * Notification click → open call room
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  console.log("[SW] Notification click → navigating:", url);

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
