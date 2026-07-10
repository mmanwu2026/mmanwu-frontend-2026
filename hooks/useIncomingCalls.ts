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

// GLOBAL guard — prevents Strict Mode double-mount
let incomingCallsInitialized = false;

export function useIncomingCalls() {
  const { supabase } = useSupabase();

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    id: string;
    room_id: string;
    caller_id: string;
  } | null>(null);

  // Load authenticated user
  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      setAuthUserId(user?.id ?? null);
    }
    loadSession();
  }, [supabase]);

  // Subscribe to call events ONCE globally
  useEffect(() => {
    if (!authUserId) return;

    // Prevent second subscription (Strict Mode fix)
    if (incomingCallsInitialized) return;
    incomingCallsInitialized = true;

    const channel = supabase.channel(`call-events:${authUserId}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "call_events",
        filter: `target_user_id=eq.${authUserId}`,
      },
      (payload: CallEventPayload) => {
        console.log("CALL DEBUG → incoming call event:", payload.new);

        const row = payload.new;

        setIncomingCall({
          id: row.id,
          room_id: row.room_id,
          caller_id: row.caller_id,
        });
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUserId, supabase]);

  return { incomingCall, setIncomingCall };
}
