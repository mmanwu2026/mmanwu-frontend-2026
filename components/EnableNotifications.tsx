"use client";

import { useState } from "react";
import { useSupabase } from "../app/context/SupabaseContext";
import { registerPushToken } from "@/app/push/registerPushToken";

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

      // Register Firebase messaging service worker
      await navigator.serviceWorker.register("/firebase-messaging-sw.js");

      // Generate and save FCM token
      await registerPushToken(user.id, supabase);

      // Mark enabled
      localStorage.setItem("notifications_enabled", "true");

      alert("Notifications enabled!");
      setLoading(false);

    } catch (err) {
      console.error("FCM setup failed:", err);
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
