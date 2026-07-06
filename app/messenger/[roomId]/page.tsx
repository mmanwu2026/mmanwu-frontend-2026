"use client";

import { useParams } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import MessengerThread from "@/components/messenger/MessengerThread";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  if (!params) return null;

  const roomId = params.roomId;

  const supabase = useSupabase();
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id);
    }
    loadUser();
  }, [supabase]);

  // ⭐ NEW: Mark messages as read when entering the room
  useEffect(() => {
    if (!userId || !roomId) return;

    async function markRoomAsSeen() {
      await supabase
        .from("room_participants")
        .update({ last_seen: new Date().toISOString() })
        .eq("room_id", roomId)
        .eq("user_id", userId);
    }

    markRoomAsSeen();
  }, [userId, roomId, supabase]);

  if (!userId) {
    return <div className="p-6 text-white">Loading user…</div>;
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <MessengerThread
        userId={userId}
        roomId={roomId}
      />
    </div>
  );
}
