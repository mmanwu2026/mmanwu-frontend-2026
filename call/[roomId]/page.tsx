"use client";

import { useParams } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
// import your WebRTC call UI

export default function CallRoomPage() {
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

  // ⭐ NEW: record call subscription
  useEffect(() => {
    if (!userId || !roomId) return;

    async function markCallSubscription() {
      await supabase
        .from("call_subscriptions")
        .upsert({
          user_id: userId,
          room_id: roomId,
          last_joined_at: new Date().toISOString(),
        });
    }

    markCallSubscription();
  }, [userId, roomId, supabase]);

  if (!userId) {
    return <div className="p-6 text-white">Loading user…</div>;
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Your WebRTC call UI goes here */}
    </div>
  );
}
