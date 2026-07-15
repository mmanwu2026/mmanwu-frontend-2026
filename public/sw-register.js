if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/firebase-messaging-sw.js")
    .then(() => console.log("FCM SW registered at root"))
    .catch(err => console.error("FCM SW registration failed:", err));
}
