"use client";

import { useState } from "react";
import { useSupabase } from "../app/context/SupabaseContext";

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

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Notifications were not enabled.");
        setLoading(false);
        return;
      }

      // ⭐ Mark notifications as enabled
      localStorage.setItem("notifications_enabled", "true");

      // ⭐ No redirect needed — unified feed will re-render automatically
      window.location.reload();

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
