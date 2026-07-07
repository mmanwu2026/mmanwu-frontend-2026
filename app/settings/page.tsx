"use client";

import { useEffect } from "react";
import { registerPush } from "@/utils/push";
import { useSupabase } from "@/context/SupabaseContext";

export default function SettingsPage() {
  const { supabase, user } = useSupabase();

  useEffect(() => {
    if (!user) return; // wait until user is loaded

    const btn = document.getElementById("enableNotifications");
    if (!btn) return;

    const handler = () => {
      registerPush(user.id, supabase);
    };

    btn.addEventListener("click", handler);
    return () => btn.removeEventListener("click", handler);
  }, [supabase, user]);

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
