"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import MessengerSidebar from "@/components/messenger/MessengerSidebar";
import { useRouter } from "next/navigation";

const FALLBACK_AVATAR =
  "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

export default function MessengerPage() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [threads, setThreads] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ---------------- LOAD USER ---------------- */
  useEffect(() => {
    async function loadSession() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
      setSessionLoading(false);
    }
    loadSession();
  }, [supabase]);

  /* ---------------- LOAD FOLLOWED USERS ---------------- */
  useEffect(() => {
    async function loadUsers() {
      if (!uid) {
        setLoading(false);
        return;
      }

      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", uid);

      const ids = following?.map((f) => f.following_id) ?? [];

      if (ids.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);

      setUsers(profiles || []);
      setLoading(false);
    }

    loadUsers();
  }, [uid, supabase]);

  /* ---------------- LOAD THREADS FOR RECENTS ---------------- */
  useEffect(() => {
    async function loadThreads() {
      if (!uid) return;

      const { data: userRoomsRaw } = await supabase
        .from("room_participants")
        .select("room_id, user_id, last_seen")
        .eq("user_id", uid);

      const userRooms = userRoomsRaw ?? [];

      if (userRooms.length === 0) {
        setThreads([]);
        return;
      }

      const roomIds = userRooms.map((r) => r.room_id);

      const { data: roomsRaw } = await supabase
        .from("rooms")
        .select("id, is_group")
        .in("id", roomIds);

      const rooms = roomsRaw ?? [];

      const { data: participantsRaw } = await supabase
        .from("room_participants")
        .select("room_id, user_id, last_seen")
        .in("room_id", roomIds);

      const participants = participantsRaw ?? [];

      const { data: lastMessagesRaw } = await supabase
        .from("messages")
        .select("room_id, sender_id, message_type, content, created_at")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false });

      const lastMessages = lastMessagesRaw ?? [];

      const lastMessageMap: Record<string, any> = {};
      for (const msg of lastMessages) {
        if (!lastMessageMap[msg.room_id]) {
          lastMessageMap[msg.room_id] = msg;
        }
      }

      const finalThreads = rooms.map((room) => {
        const roomParticipants = participants
          .filter((p) => p.room_id === room.id)
          .map((p) => p.user_id);

        const otherUsers = roomParticipants.filter((id) => id !== uid);

        const last = lastMessageMap[room.id] || null;

        const profile =
          otherUsers.length === 1
            ? users.find((u) => u.id === otherUsers[0])
            : null;

        return {
          roomId: room.id,
          isGroup: room.is_group,
          otherUserId: otherUsers.length === 1 ? otherUsers[0] : null,
          profile,
          lastMessage: last,
        };
      });

      setThreads(finalThreads);
    }

    loadThreads();
  }, [uid, users, supabase]);

  /* ---------------- LOAD RECENT CALLS ---------------- */
  useEffect(() => {
    async function loadRecentCalls() {
      if (!uid) return;

      const { data } = await supabase
        .from("call_logs")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20);

      setRecentCalls(data || []);
    }

    loadRecentCalls();
  }, [uid, supabase]);

  /* ---------------- MOBILE SWIPE GESTURE ---------------- */
  useEffect(() => {
    let startX = 0;
    let endX = 0;

    function handleTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
    }

    function handleTouchMove(e: TouchEvent) {
      endX = e.touches[0].clientX;
    }

    function handleTouchEnd() {
      const delta = endX - startX;

      if (delta > 80) setSidebarOpen(true);
      if (delta < -80) setSidebarOpen(false);
    }

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  /* ---------------- LOADING STATES ---------------- */
  if (sessionLoading || loading) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl mb-4">Messenger</h1>
        <p>Loading…</p>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl mb-4">Messenger</h1>
        <p>Please sign in to use Messenger.</p>
      </div>
    );
  }

  /* ---------------- MAIN LAYOUT ---------------- */
  return (
    <div className="h-screen flex flex-col bg-black text-white">

      {/* ⭐ Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Messenger</h1>
        <button
          onClick={() => setSidebarOpen(true)}
          className="px-3 py-2 bg-purple-700 rounded-lg"
        >
          Chats
        </button>
      </div>

      {/* ⭐ Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 overflow-x-hidden">

        {/* ⭐ Sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 w-64 bg-gray-900 z-40 transform
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:static md:translate-x-0 md:w-72 md:flex-shrink-0
          `}
        >
          <MessengerSidebar
            users={users}
            userId={uid}
            onSelect={() => setSidebarOpen(false)}
          />

          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute top-4 right-4 text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* ⭐ Main Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ⭐ Recent Conversations */}
          <h2 className="text-xl font-bold mb-4">Recent Conversations</h2>

          {threads.length === 0 ? (
            <p className="text-neutral-500 mb-6">No recent conversations</p>
          ) : (
            threads.map((t) => {
              const profile = t.profile;
              const avatar =
                profile?.avatar_url || FALLBACK_AVATAR;
              const name =
                profile?.display_name || profile?.username || "Unknown User";

              const preview =
                t.lastMessage?.message_type === "text"
                  ? t.lastMessage.content
                  : t.lastMessage?.message_type === "image"
                  ? "Sent an image"
                  : t.lastMessage?.message_type === "audio"
                  ? "Sent an audio clip"
                  : t.lastMessage?.message_type === "video"
                  ? "Sent a video"
                  : "No messages yet";

              const timestamp = t.lastMessage
                ? new Date(t.lastMessage.created_at).toLocaleString()
                : "";

              return (
                <button
                  key={t.roomId}
                  onClick={() => router.push(`/messenger/${t.roomId}`)}
                  className="flex items-center gap-4 w-full px-4 py-3 bg-neutral-800 rounded-lg mb-3 hover:bg-neutral-700 text-left"
                >
                  <img
                    src={avatar}
                    className="w-12 h-12 rounded-full object-cover"
                  />

                  <div className="flex-1">
                    <div className="font-bold">{name}</div>

                    <div className="text-neutral-400 text-sm">
                      {preview}
                    </div>

                    <div className="text-neutral-500 text-xs mt-1">
                      {timestamp}
                    </div>
                  </div>
                </button>
              );
            })
          )}

          {/* ⭐ Recent Calls */}
          <h2 className="text-xl font-bold mt-10 mb-4">Recent Calls</h2>

          {recentCalls.length === 0 ? (
            <p className="text-neutral-500">No recent calls</p>
          ) : (
            recentCalls.map((call) => (
              <div
                key={call.id}
                className="px-4 py-3 bg-neutral-800 rounded-lg mb-3"
              >
                <div className="text-sm">{call.other_user_id}</div>
                <div className="text-xs text-neutral-400">
                  {new Date(call.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}
