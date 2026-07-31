"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/app/context/SupabaseContext";
import NewChatModal from "./NewChatModal";

interface RoomParticipant {
  room_id: string;
  user_id: string;
  last_seen: string | null;
}

interface Room {
  id: string;
  is_group: boolean;
}

interface Message {
  room_id: string;
  sender_id: string;
  message_type: string;
  content: string | null;
  created_at: string;
}

interface Thread {
  roomId: string;
  isGroup: boolean;
  participants: string[];
  otherUserId: string | null;
  lastMessage: Message | null;
  inCall: boolean;
  unreadCount: number;
}

const FALLBACK_AVATAR =
  "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

export default function MessengerSidebar({
  users,
  userId,
  onSelect,
}: {
  users: any[];
  userId: string;
  onSelect?: () => void;
}) {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);

  const [search, setSearch] = useState("");
  const [pinned, setPinned] = useState<string[]>([]); // roomIds

  function getUserProfile(id: string | null) {
    if (!id) return null;
    return users.find((u: any) => u.id === id) || null;
  }

  /* ---------------- LOAD THREADS ---------------- */
  useEffect(() => {
    async function loadThreads() {
      if (!userId) return;

      const { data: userRoomsRaw } = await supabase
        .from("room_participants")
        .select("room_id, user_id, last_seen")
        .eq("user_id", userId);

      const userRooms = (userRoomsRaw ?? []) as RoomParticipant[];

      if (userRooms.length === 0) {
        setThreads([]);
        return;
      }

      const roomIds = userRooms.map((r) => r.room_id);

      const { data: roomsRaw } = await supabase
        .from("rooms")
        .select("id, is_group")
        .in("id", roomIds);

      const rooms = (roomsRaw ?? []) as Room[];

      const { data: participantsRaw } = await supabase
        .from("room_participants")
        .select("room_id, user_id, last_seen")
        .in("room_id", roomIds);

      const participants = (participantsRaw ?? []) as RoomParticipant[];

      const { data: lastMessagesRaw } = await supabase
        .from("messages")
        .select("room_id, sender_id, message_type, content, created_at")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false });

      const lastMessages = (lastMessagesRaw ?? []) as Message[];

      const lastMessageMap: Record<string, Message> = {};
      for (const msg of lastMessages) {
        if (!lastMessageMap[msg.room_id]) {
          lastMessageMap[msg.room_id] = msg;
        }
      }

      const finalThreads: Thread[] = rooms.map((room) => {
        const roomParticipants = participants
          .filter((p) => p.room_id === room.id)
          .map((p) => p.user_id);

        const otherUsers = roomParticipants.filter((id) => id !== userId);

        const last = lastMessageMap[room.id] || null;

        const participantRecord = participants.find(
          (p) => p.room_id === room.id && p.user_id === userId
        );

        const lastSeen = participantRecord?.last_seen
          ? new Date(participantRecord.last_seen)
          : new Date(0);

        const unreadCount = lastMessages.filter(
          (m) =>
            m.room_id === room.id &&
            m.sender_id !== userId &&
            new Date(m.created_at) > lastSeen
        ).length;

        return {
          roomId: room.id,
          isGroup: room.is_group,
          participants: roomParticipants,
          otherUserId: otherUsers.length === 1 ? otherUsers[0] : null,
          lastMessage: last,
          inCall: last?.message_type === "call_offer",
          unreadCount,
        };
      });

      setThreads(finalThreads);
    }

    loadThreads();
  }, [userId, supabase]);

  /* ---------------- REALTIME NEW MESSAGE INDICATOR ---------------- */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("sidebar-new-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new;

          setThreads((prev) =>
            prev.map((t) => {
              if (t.roomId !== msg.room_id) return t;
              if (msg.sender_id === userId) return t;

              return {
                ...t,
                unreadCount: t.unreadCount + 1,
                lastMessage: msg,
              };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  /* ---------------- FILTER THREADS ---------------- */
  const filteredThreads = threads.filter((t) => {
    const profile = getUserProfile(t.otherUserId);
    const name =
      profile?.display_name || profile?.username || "Unknown User";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const pinnedThreads = filteredThreads.filter((t) =>
    pinned.includes(t.roomId)
  );

  const normalThreads = filteredThreads.filter(
    (t) => !pinned.includes(t.roomId)
  );

  /* ---------------- UI ---------------- */

  return (
    <div className="w-[260px] bg-neutral-900 border-r border-neutral-800 p-4 overflow-y-auto text-white">

      <h2 className="text-lg mb-4 pointer-events-none select-none">
        Contacts
      </h2>


      {/* ⭐ Search */}
      <input
        type="text"
        placeholder="Search conversations..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 mb-4 rounded bg-neutral-800 text-white placeholder-neutral-500"
      />

      {/* ⭐ New Chat */}
      <button
        onClick={() => setShowNewChat(true)}
        className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white mb-6"
      >
        + New Chat
      </button>

      {/* ⭐ Pinned */}
      {pinnedThreads.length > 0 && (
        <>
          <h3 className="text-sm text-neutral-400 mb-2">Pinned</h3>
          <div className="space-y-2 mb-6">
            {pinnedThreads.map((t) => {
              const profile = getUserProfile(t.otherUserId);
              const name =
                profile?.display_name || profile?.username || "Unknown User";
              const avatar =
                profile?.avatar_url || FALLBACK_AVATAR;

              return (
                <button
                  key={t.roomId}
                  onClick={() => {
                    onSelect?.();
                    router.push(`/messenger/${t.roomId}`);
                  }}
                  className="w-full px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-left flex items-center gap-3"
                >
                  <img
                    src={avatar}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="font-bold">{name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ⭐ Favorites (followed users) */}
      <h3 className="text-sm text-neutral-400 mb-2">Favorites</h3>
      <div className="space-y-2 mb-6">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => {
              onSelect?.();
              router.push(`/messenger/start/${u.id}`);
            }}
            className="w-full px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-left flex items-center gap-3"
          >
            <img
              src={u.avatar_url || FALLBACK_AVATAR}
              className="w-10 h-10 rounded-full object-cover"
            />
            <span className="font-bold">
              {u.display_name || u.username}
            </span>
          </button>
        ))}
      </div>

      {/* ⭐ Threads */}
      <h3 className="text-sm text-neutral-400 mb-2">Conversations</h3>
      <div className="space-y-2">
        {normalThreads.map((t) => {
          const profile = getUserProfile(t.otherUserId);
          const name =
            profile?.display_name || profile?.username || "Unknown User";
          const avatar =
            profile?.avatar_url || FALLBACK_AVATAR;

          return (
            <button
              key={t.roomId}
              onClick={() => {
                onSelect?.();
                router.push(`/messenger/${t.roomId}`);
              }}
              className="w-full px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-left flex items-center gap-3"
            >
              <img
                src={avatar}
                className="w-10 h-10 rounded-full object-cover"
              />

              <div className="flex-1">
                <div className="font-bold">{name}</div>
                <div className="text-neutral-400 text-sm">
                  {t.lastMessage
                    ? t.lastMessage.message_type === "text"
                      ? t.lastMessage.content
                      : t.lastMessage.message_type === "image"
                      ? "Sent an image"
                      : t.lastMessage.message_type === "audio"
                      ? "Sent an audio clip"
                      : t.lastMessage.message_type === "video"
                      ? "Sent a video"
                      : t.lastMessage.message_type
                    : "No messages yet"}
                </div>
              </div>

              {/* Pin button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPinned((prev) =>
                    prev.includes(t.roomId)
                      ? prev.filter((id) => id !== t.roomId)
                      : [...prev, t.roomId]
                  );
                }}
                className="text-neutral-400 hover:text-white"
              >
                📌
              </button>
            </button>
          );
        })}
      </div>

      <NewChatModal
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        users={users}
        userId={userId}
      />
    </div>
  );
}
