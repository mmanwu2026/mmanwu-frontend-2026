"use client";

import { registerPush } from "@/utils/push";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";

export default function SettingsPage() {
  const supabase = useSupabase();
  const { user } = useUser();

  async function enableNotifications() {
    try {
      // 1. Ask for permission (Safari-safe because it's inside a click)
      const permission = await Notification.requestPermission();
      console.log("Notification permission:", permission);

      if (permission !== "granted") {
        console.warn("User did not grant permission");
        return;
      }

      if (!user?.id) {
        console.warn("No user ID available");
        return;
      }

      // 2. Create push subscription only after permission is granted
      const subscription = await registerPush(user.id, supabase);
      console.log("Push subscription created:", subscription);
    } catch (err) {
      console.error("Failed to enable notifications:", err);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-white text-xl mb-4">Settings</h1>

      <button
        onClick={enableNotifications}
        className="text-white px-4 py-2 rounded bg-purple-600 hover:bg-purple-500"
      >
        Enable Notifications
      </button>
    </div>
  );
}
