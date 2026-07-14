"use client";

import { useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";

export default function NewChatModal({
  open,
  onClose,
  users,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  users: any[];
  userId: string;
}) {
  const { supabase } = useSupabase();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<string | null>(null);

  if (!open) return null;

  async function startChat(targetUserId: string) {
    setCreating(targetUserId);

    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      console.error("Cannot create room — no Supabase session.");
      setCreating(null);
      return;
    }

    // 1. Check for existing 1-to-1 room
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

    // 2. Create new room
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

    // 3. Add participants
    await supabase.from("room_participants").insert([
      { room_id: room.id, user_id: userId },
      { room_id: room.id, user_id: targetUserId },
    ]);

    window.location.href = `/messenger/${room.id}`;
  }

  return (
    <div className="fixed inset-0 z-50">

      {/* ⭐ Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* ⭐ Modal container (mobile centered, desktop beside sidebar) */}
      <div
        className="
          absolute
          left-1/2 top-1/2
          -translate-x-1/2 -translate-y-1/2
          w-[90%] max-w-md
          md:left-[260px] md:top-20 md:-translate-x-0 md:-translate-y-0
          bg-neutral-900
          rounded-xl
          p-5
          border border-neutral-700
          shadow-xl
        "
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl font-semibold">New Chat</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        {/* Search bar */}
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-neutral-800 text-white placeholder-neutral-500"
        />

        {/* User list */}
        <div className="max-h-[300px] overflow-y-auto space-y-2">
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
                className="w-full flex items-center gap-3 px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-white disabled:opacity-50"
              >
                <img
                  src={
                    u.avatar_url ??
                    "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png"
                  }
                  className="w-10 h-10 rounded-full object-cover"
                  alt="avatar"
                />

                <div className="flex flex-col">
                  <span className="font-bold">
                    {u.display_name ?? u.username}
                  </span>
                  <span className="text-neutral-400 text-sm">
                    Tap to start a conversation
                  </span>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
