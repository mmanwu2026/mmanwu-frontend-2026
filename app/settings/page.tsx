"use client";

import { useEffect, useState } from "react";
import { registerPush } from "@/utils/push";
import { useSupabase } from "@/context/SupabaseContext";

export default function SettingsPage() {
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

  // ⭐ Attach click handler
  useEffect(() => {
    const btn = document.getElementById("enableNotifications");
    if (!btn) return;

    const handler = () => {
      if (!userId) {
        console.error("No user found — cannot register push.");
        return;
      }

      registerPush(userId, supabase);
    };

    btn.addEventListener("click", handler);
    return () => btn.removeEventListener("click", handler);
  }, [supabase, userId]);

  return (
    <div className="text-white p-4">
      <h1 className="text-xl font-bold mb-4">Settings</h1>

      <button
        id="enableNotifications"
        className="mt-4 px-4 py-2 bg-blue-600 rounded"
      >
        Enable Notifications
      </button>
    </div>
  );
}
