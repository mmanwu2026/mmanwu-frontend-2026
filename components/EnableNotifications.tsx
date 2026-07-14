"use client";

import { useState } from "react";
import { useSupabase } from "../app/context/SupabaseContext";

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

export default function EnableNotifications() {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    try {
      setLoading(true);

      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;

      if (!user) {
        alert("You must be logged in.");
        setLoading(false);
        return;
      }

      // Ask permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Notifications were not enabled.");
        setLoading(false);
        return;
      }

      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js");

      // Create push subscription
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      // Save subscription
      await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        subscription,
      });

      // Mark enabled
      localStorage.setItem("notifications_enabled", "true");

      alert("Notifications enabled!");
      setLoading(false);

    } catch (err) {
      console.error("Push setup failed:", err);
      alert("Could not enable notifications.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleEnable}
      disabled={loading}
      className="px-4 py-2 bg-purple-600 text-white rounded-lg"
    >
      {loading ? "Enabling…" : "Enable Notifications"}
    </button>
  );
}
