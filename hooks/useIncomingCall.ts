
"use client";

import { useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";

interface CallMessage {
  room_id: string;
  sender_id: string;
  receiver_id: string;
  message_type: string;
  metadata: any;
}

export default function useIncomingCall(userId: string | undefined) {
  const { supabase } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`incoming-calls-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload: { new: CallMessage }) => {
          const msg = payload.new;

          // ⭐ Manual filtering (Supabase Realtime v2 requires this)
          if (
            msg.receiver_id !== userId ||
            msg.message_type !== "call_offer"
          ) {
            return;
          }

          // ⭐ Now callee receives the call instantly
          router.push(`/messenger/${msg.room_id}?incoming=1`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, router]);
}
