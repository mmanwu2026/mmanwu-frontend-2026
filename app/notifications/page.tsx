"use client";

import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import { registerPush } from "@/utils/push";

export default function NotificationsPage() {
  const { supabase } = useSupabase();
  const [userId, setUserId] = useState<string | null>(null);

  // ⭐ Load user ID
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const id = session.data.session?.user?.id || null;
      setUserId(id);
    }
    loadUser();
  }, [supabase]);

  // ⭐ iOS detection — prevents PWA crash
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // ⭐ Attach click handler
  useEffect(() => {
    const btn = document.getElementById("enableNotifications");
    if (!btn) return;

    const handler = () => {
      if (!userId) {
        console.error("No user found — cannot register push.");
        return;
      }

      if (isIOS) {
        console.warn("Push disabled on iOS Safari — skipping registerPush()");
        return;
      }

      registerPush(supabase).catch((err) => {
        console.warn("Push registration failed (non-blocking):", err);
      });
    };

    btn.addEventListener("click", handler);
    return () => btn.removeEventListener("click", handler);
  }, [supabase, userId, isIOS]);

  return (
    <div className="text-white p-4">
      <h1 className="text-xl font-bold mb-4">Notifications</h1>
      <p>Your notifications will appear here.</p>

      <button
        id="enableNotifications"
        className="mt-4 px-4 py-2 bg-blue-600 rounded"
      >
        Enable Notifications
      </button>
    </div>
  );
}
