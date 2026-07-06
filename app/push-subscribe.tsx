"use client";

import { useEffect } from "react";

const VAPID_PUBLIC_KEY = "BALg6s-s9f1Y7SR6AeTsD78C1cMamfe7As7OeWLjHhXp-fVjUz6qj3jx9QFZvzv3xp_YLZklxUt-zIXnJTwJBCw";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function PushSubscribe() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!("PushManager" in window)) return;

    async function subscribe() {
      const registration = await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const existing = await registration.pushManager.getSubscription();
      if (existing) return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
    }

    subscribe().catch(console.error);
  }, []);

  return null;
}
