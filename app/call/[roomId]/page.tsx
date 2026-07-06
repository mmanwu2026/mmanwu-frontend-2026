"use client";

import { useParams } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import CallRoom from "@/components/call/CallRoom";

export default function CallPage() {
  const params = useParams<{ roomId: string }>();
  const roomIdParam = params?.roomId ?? "";   // ⭐ ALWAYS a string

  const supabase = useSupabase();
  const [userId, setUserId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  // ⭐ Load current user
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id ?? null);
    }
    loadUser();
  }, [supabase]);

  // ⭐ Load caller + callee from call_events
  useEffect(() => {
    if (!roomIdParam || !userId) return;

    async function loadOther() {
      const { data } = await supabase
        .from("call_events")
        .select("caller_id, target_user_id")
        .eq("room_id", roomIdParam)
        .single();

      if (!data) return;

      const { caller_id, target_user_id } = data;

      // Determine who is "other"
      if (caller_id === userId) {
        setOtherUserId(target_user_id);
      } else {
        setOtherUserId(caller_id);
      }
    }

    loadOther();
  }, [roomIdParam, userId, supabase]);

  // ⭐ Render loading until all required values are ready
  if (!userId || !otherUserId) {
    return <div className="p-6 text-white">Loading call…</div>;
  }

  // ⭐ Now TypeScript knows these are strings
  return (
    <CallRoom
      userId={userId}
      roomId={roomIdParam}
      otherUserId={otherUserId}
    />
  );
}
