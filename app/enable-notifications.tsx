"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EnableNotifications() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    try {
      setLoading(true);

      // 1. Ask for permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Notifications were not enabled.");
        setLoading(false);
        return;
      }

      // 2. Register service worker
      const reg = await navigator.serviceWorker.ready;

      // 3. Create push subscription
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // 4. Send subscription to your backend
      await fetch("/api/save-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      // 5. Redirect AFTER subscription succeeds
      router.replace("/plaza");
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
      style={{
        marginTop: 20,
        padding: "12px 24px",
        background: "#ffffff22",
        border: "1px solid #ffffff55",
        borderRadius: 8,
        color: "white",
        fontSize: "1rem",
        cursor: "pointer",
      }}
    >
      {loading ? "Enabling…" : "Enable Notifications"}
    </button>
  );
}
