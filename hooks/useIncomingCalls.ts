"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";

interface CallEventPayload {
  new: {
    id: string;
    room_id: string;
    caller_id: string;
    target_user_id: string;
    status: string;
    created_at: string;
  };
}

export function useIncomingCalls(userId: string | null) {
  const { supabase } = useSupabase();

  const [incomingCall, setIncomingCall] = useState<{
    id: string;
    room_id: string;
    caller_id: string;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`call-events:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_events",
          filter: `target_user_id=eq.${userId}`,
        },
        (payload: CallEventPayload) => {
          const row = payload.new;

          setIncomingCall({
            id: row.id,
            room_id: row.room_id,
            caller_id: row.caller_id,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return { incomingCall, setIncomingCall };
}
