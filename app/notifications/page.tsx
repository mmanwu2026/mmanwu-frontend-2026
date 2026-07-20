"use client";

import { useSupabase } from "@/app/context/SupabaseContext";
import { useEffect, useState } from "react";
import EnableNotifications from "@/components/EnableNotifications";
import { useRouter } from "next/navigation";

const FALLBACK_AVATAR =
  "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

export default function NotificationsPage() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<string | null>(null);

  const [notifList, setNotifList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- LOAD USER ---------------- */
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

  /* ---------------- FETCH NOTIFICATIONS ---------------- */
  useEffect(() => {
    if (!userId) return;
    loadNotifications();
  }, [userId]);

  async function loadNotifications() {
    setLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select("*, actor:actor_id(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifList(data);
    }

    setLoading(false);
  }

  /* ---------------- DISABLE NOTIFICATIONS ---------------- */
  async function disableNotifications() {
    if (!userId) return;

    await supabase.from("push_subscriptions").delete().eq("user_id", userId);

    localStorage.setItem("notifications_enabled", "false");
    setNotificationsEnabled("false");

    alert("Notifications disabled.");
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4">
      <h1 className="text-xl font-bold mb-4">Notifications</h1>

      <p className="mb-6 text-gray-700">
        Manage your notification preferences and view your activity alerts.
      </p>

      {/* ---------------- SETTINGS ---------------- */}
      <div className="p-4 border rounded-lg bg-gray-50 mb-6">
        <h2 className="text-lg font-semibold mb-3">Notification Settings</h2>

        {notificationsEnabled !== "true" ? (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Notifications are currently <strong>disabled</strong>.
            </p>
            <EnableNotifications />
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Notifications are <strong>enabled</strong>.
            </p>

            <button
              onClick={disableNotifications}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 mb-4"
            >
              Disable Notifications
            </button>
          </>
        )}
      </div>

      {/* ---------------- NOTIFICATION LIST ---------------- */}
      <h2 className="text-lg font-semibold mb-3">Your Notifications</h2>

      {loading && <p className="text-gray-600">Loading...</p>}

      {notifList.length === 0 && !loading && (
        <p className="text-gray-600">You have no notifications yet.</p>
      )}

      <div className="space-y-4">
        {notifList.map((n) => {
          const actor = n.actor || {};

          return (
            <div
              key={n.id}
              className="p-4 border rounded-lg bg-gray-50 flex items-start gap-3 cursor-pointer"
              onClick={() => {
                if (n.event_type === "dm_message" && n.dm_room_id) {
                  router.push(`/messenger/${n.dm_room_id}`);
                }
              }}
            >
              <img
                src={actor.avatar_url || FALLBACK_AVATAR}
                alt="actor avatar"
                className="w-10 h-10 rounded-full object-cover"
              />

              <div className="flex-1">

                {/* DM Message Notification */}
                {n.event_type === "dm_message" ? (
                  <>
                    <p className="text-sm text-gray-800">
                      <strong>
                        {actor.display_name ||
                          actor.username ||
                          "Someone"}
                      </strong>{" "}
                      sent you a message
                    </p>

                    <p className="text-neutral-600 text-sm mt-1 line-clamp-1">
                      {n.message_type === "text" && n.message}
                      {n.message_type === "image" && "Sent an image"}
                      {n.message_type === "audio" && "Sent an audio clip"}
                      {n.message_type === "video" && "Sent a video"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-800">
                      <strong>{actor.username || "Someone"}</strong>{" "}
                      {n.message}
                    </p>
                  </>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>

                <span className="inline-block mt-2 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                  {n.event_type}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
