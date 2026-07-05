"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/context/SupabaseContext";

interface RoomParticipant {
  room_id: string;
  user_id: string;
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
}

interface Thread {
  roomId: string;
  isGroup: boolean;
  participants: string[];
  otherUserId: string | null;
  lastMessage: Message | null;
  inCall: boolean;
}

export default function MessengerSidebar({
  users,
  userId,
}: {
  users: any[];
  userId: string;
}) {
  const supabase = useSupabase();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [creating, setCreating] = useState<string | null>(null);

  // ⭐ NEW: Search state
  const [search, setSearch] = useState("");

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
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        console.warn("No Supabase session yet — delaying thread load.");
        return;
      }

      const { data: userRooms, error: roomsError } = await supabase
        .from("room_participants")
        .select("room_id")
        .eq("user_id", userId);

      if (roomsError || !userRooms) {
        console.error("Failed to load rooms:", roomsError);
        return;
      }

      const roomIds = userRooms.map((r: { room_id: string }) => r.room_id);

      if (roomIds.length === 0) {
        setThreads([]);
        return;
      }

      const { data: roomsRaw } = await supabase
        .from("rooms")
        .select("*")
        .in("id", roomIds);

      const rooms = (roomsRaw ?? []) as Room[];

      const { data: participantsRaw } = await supabase
        .from("room_participants")
        .select("*")
        .in("room_id", roomIds);

      const participants = (participantsRaw ?? []) as RoomParticipant[];

      const { data: lastMessagesRaw } = await supabase
        .from("messages")
        .select("*")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false });

      const lastMessages = (lastMessagesRaw ?? []) as Message[];

      const lastMessageMap: Record<string, Message> = {};
      for (const msg of lastMessages) {
        if (!lastMessageMap[msg.room_id]) {
          lastMessageMap[msg.room_id] = msg;
        }
      }

      const finalThreads: Thread[] = rooms.map((room: Room) => {
        const roomParticipants = participants
          .filter((p: RoomParticipant) => p.room_id === room.id)
          .map((p: RoomParticipant) => p.user_id);

        const otherUsers = roomParticipants.filter(
          (id: string) => id !== userId
        );

        const last = lastMessageMap[room.id] || null;

        return {
          roomId: room.id,
          isGroup: room.is_group,
          participants: roomParticipants,
          otherUserId: otherUsers.length === 1 ? otherUsers[0] : null,
          lastMessage: last,
          inCall: last?.message_type === "call_offer",
        };
      });

      setThreads(finalThreads);
    }

    loadThreads();
  }, [userId, supabase]);

  async function startChat(targetUserId: string) {
    setCreating(targetUserId);

    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      console.error("Cannot create room — no Supabase session.");
      setCreating(null);
      return;
    }

    const { data: existingRooms, error: findError } = await supabase
      .from("room_participants")
      .select("room_id")
      .in("user_id", [userId, targetUserId]);

    if (findError) {
      console.error("Failed to check existing rooms:", findError);
      setCreating(null);
      return;
    }

    const counts: Record<string, number> = {};
    for (const row of existingRooms ?? []) {
      counts[row.room_id] = (counts[row.room_id] || 0) + 1;
    }

    const existingRoomId = Object.entries(counts)
      .find(([_, count]) => count === 2)?.[0];

    if (existingRoomId) {
      window.location.href = `/messenger/${existingRoomId}`;
      return;
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        is_group: false,
        created_by: userId,
      })
      .select()
      .single();

    if (roomError || !room) {
      console.error("Failed to create room:", roomError);
      setCreating(null);
      return;
    }

    await supabase.from("room_participants").insert([
      { room_id: room.id, user_id: userId },
      { room_id: room.id, user_id: targetUserId },
    ]);

    window.location.href = `/messenger/${room.id}`;
  }

  return (
    <div className="w-[260px] bg-neutral-900 border-r border-neutral-800 p-4 overflow-y-auto">
      <h2 className="text-white text-lg mb-4">Chats</h2>

      <div className="space-y-2 mb-6">
        {threads.map((t) => {
          const profile = getUserProfile(t.otherUserId);
          const displayName =
            profile?.display_name ?? profile?.username ?? "Unknown User";

          return (
            <Link
              key={t.roomId}
              href={`/messenger/${t.roomId}`}
              className="block px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-white"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  {t.isGroup ? "Group Chat" : `Chat with ${displayName}`}
                </span>

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
            </Link>
          );
        })}
      </div>

      <h3 className="text-white text-md mb-2">Start New Chat</h3>

      {/* ⭐ NEW: Search bar */}
      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded bg-neutral-800 text-white placeholder-neutral-500"
      />

      <div className="space-y-2">
        {users
          .filter((u) =>
            (u.display_name ?? u.username)
              .toLowerCase()
              .includes(search.toLowerCase())
          )
          .map((u) => (
            <button
              key={u.id}
              onClick={() => startChat(u.id)}
              disabled={creating === u.id}
              className="w-full text-left px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-white disabled:opacity-50"
            >
              <div className="font-bold">
                {u.display_name ?? u.username}
              </div>
              <div className="text-neutral-400 text-sm">
                Click to start a conversation
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
