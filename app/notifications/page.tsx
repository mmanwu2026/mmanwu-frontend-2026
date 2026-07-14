"use client";

import { useSupabase } from "@/app/context/SupabaseContext";
import { useEffect, useState } from "react";
import EnableNotifications from "@/components/EnableNotifications";

export default function NotificationsPage() {
  const { supabase } = useSupabase();
  const [userId, setUserId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const id = session.data.session?.user?.id || null;
      setUserId(id);

      const flag = localStorage.getItem("notifications_enabled");
      setNotificationsEnabled(flag);
    }
    loadUser();
  }, [supabase]);

  function disableNotifications() {
    localStorage.setItem("notifications_enabled", "false");
    setNotificationsEnabled("false");
  }

  async function sendTestNotification() {
    if (!userId) return;

    await fetch("/functions/v1/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: null, // server will fetch user subscription
        payload: {
          title: "MMAN Plaza",
          body: "Your notification settings are working!",
          icon: "/icons/mman-192.png",
          url: "/notifications",
        },
      }),
    });
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4">
      <h1 className="text-xl font-bold mb-4">Notifications</h1>

      <p className="mb-6 text-gray-700">
        Manage your notification preferences and test your setup.
      </p>

      <div className="p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-3">Notification Settings</h2>

        {notificationsEnabled !== "true" ? (
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Notifications are currently <strong>disabled</strong>.
            </p>
            <EnableNotifications />
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Notifications are <strong>enabled</strong>.
            </p>

            <button
              onClick={disableNotifications}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 mb-4"
            >
              Disable Notifications
            </button>

            <button
              onClick={sendTestNotification}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
            >
              Send Test Notification
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
