"use client";

import { useParams } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import MessengerThread from "@/components/messenger/MessengerThread";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId;

  const { supabase } = useSupabase();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [otherUserId, setOtherUserId] = useState<string | undefined>(undefined);

  // Load current user
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id);
    }
    loadUser();
  }, [supabase]);

  // Load other participant
  useEffect(() => {
    if (!userId || !roomId) return;

    async function loadOther() {
      const { data } = await supabase
        .from("room_participants")
        .select("user_id")
        .eq("room_id", roomId);

      if (!data) return;

      const others = data.filter(
        (p: { user_id: string }) => p.user_id !== userId
      );

      if (others.length > 0) {
        setOtherUserId(others[0].user_id);
      }
    }

    loadOther();
  }, [userId, roomId, supabase]);

  if (!userId) {
    return <div className="p-6 text-white">Loading user…</div>;
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <MessengerThread
        userId={userId}
        roomId={roomId}
        otherUserId={otherUserId}
      />
    </div>
  );
}
