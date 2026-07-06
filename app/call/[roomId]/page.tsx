"use client";

import { useParams } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import CallRoom from "@/components/call/CallRoom";

export default function CallPage() {
  const params = useParams<{ roomId: string }>();
  const roomIdParam = params?.roomId ?? "";

  const supabase = useSupabase();
  const [userId, setUserId] = useState<string | null>(null);
  const [callerId, setCallerId] = useState<string | null>(null);

  // Load current user
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id ?? null);
    }
    loadUser();
  }, [supabase]);

  // Load caller_id from call_events
  useEffect(() => {
    if (!roomIdParam) return;

    async function loadCallEvent() {
      const { data } = await supabase
        .from("call_events")
        .select("caller_id")
        .eq("room_id", roomIdParam)
        .single();

      if (data) {
        setCallerId(data.caller_id);
      }
    }

    loadCallEvent();
  }, [roomIdParam, supabase]);

  if (!userId || !callerId) {
    return <div className="p-6 text-white">Loading call…</div>;
  }

  return (
    <CallRoom
      userId={userId}
      roomId={roomIdParam}
      callerId={callerId}   // ⭐ REQUIRED
    />
  );
}
