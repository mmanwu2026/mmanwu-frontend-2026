"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
}: {
  users: any[];
  userId: string;
}) {
  const { supabase } = useSupabase();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);

  if (!userId) {
    return (
      <div className="w-[260px] bg-neutral-900 border-r border-neutral-800 p-4 text-white">
        Loading…
      </div>
    );
  }

  function getUserProfile(id: string | null) {
    if (!id) return null;
    return users.find((u: any) => u.id === id) || null;
  }

  useEffect(() => {
    async function loadThreads() {
      if (!userId) return;

      // 1. Rooms user is in
      const { data: userRoomsRaw } = await supabase
        .from("room_participants")
        .select("room_id, user_id, last_seen")
        .eq("user_id", userId);

      const userRooms = (userRoomsRaw ?? []) as RoomParticipant[];

      if (userRooms.length === 0) {
        setThreads([]);
        return;
      }

      // ⭐ FIX: Explicit typing removes TS error
      const roomIds = userRooms.map((r: RoomParticipant) => r.room_id);

      // 2. Fetch rooms
      const { data: roomsRaw } = await supabase
        .from("rooms")
        .select("id, is_group")
        .in("id", roomIds);

      const rooms = (roomsRaw ?? []) as Room[];

      // 3. Fetch participants
      const { data: participantsRaw } = await supabase
        .from("room_participants")
        .select("room_id, user_id, last_seen")
        .in("room_id", roomIds);

      const participants = (participantsRaw ?? []) as RoomParticipant[];

      // 4. Fetch ONLY real chat messages
      const { data: lastMessagesRaw } = await supabase
        .from("messages")
        .select("room_id, sender_id, message_type, content, created_at")
        .in("room_id", roomIds)
        .in("message_type", ["text", "image", "audio"])
        .order("created_at", { ascending: false });

      const lastMessages = (lastMessagesRaw ?? []) as Message[];

      // Build lastMessage map
      const lastMessageMap: Record<string, Message> = {};
      for (const msg of lastMessages) {
        if (!lastMessageMap[msg.room_id]) {
          lastMessageMap[msg.room_id] = msg;
        }
      }

      // Build threads
      const finalThreads: Thread[] = rooms.map((room: Room) => {
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

        // ⭐ Correct unread logic using last_seen
        const unreadCount = lastMessages.filter(
          (m) =>
            m.room_id === room.id &&
            m.sender_id !== userId &&
            ["text", "image", "audio"].includes(m.message_type) &&
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

  return (
    <div className="w-[260px] bg-neutral-900 border-r border-neutral-800 p-4 overflow-y-auto">
      <h2 className="text-white text-lg mb-4">Chats</h2>

      <button
        onClick={() => setShowNewChat(true)}
        className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white mb-4"
      >
        + New Chat
      </button>

      <div className="space-y-2 mb-6">
        {threads.map((t) => {
          const profile = getUserProfile(t.otherUserId);
          const displayName =
            profile?.display_name ?? profile?.username ?? "Unknown User";

          const avatar =
            profile?.avatar_url && profile.avatar_url.trim() !== ""
              ? profile.avatar_url
              : FALLBACK_AVATAR;

          return (
            <Link
              key={t.roomId}
              href={`/messenger/${t.roomId}`}
              className="block px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-white"
            >
              <div className="flex items-center gap-3">
                <img src={avatar} alt="avatar" className="avatar" />

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {t.isGroup ? "Group Chat" : displayName}
                    </span>

                    {t.unreadCount > 0 && (
                      <span className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded-full">
                        {t.unreadCount}
                      </span>
                    )}

                    {t.inCall && (
                      <span className="ml-2 text-xs px-2 py-1 rounded bg-green-700 text-green-100">
                        In Call
                      </span>
                    )}
                  </div>

                  <div className="text-neutral-400 text-sm">
                    {t.lastMessage
                      ? t.lastMessage.message_type === "call_offer"
                        ? `Call started by ${t.lastMessage.sender_id}`
                        : `${t.lastMessage.sender_id}: ${
                            t.lastMessage.content ?? t.lastMessage.message_type
                          }`
                      : "No messages yet"}
                  </div>
                </div>
              </div>
            </Link>
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
