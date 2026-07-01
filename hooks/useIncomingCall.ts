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
  const supabase = useSupabase();
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
          filter: `receiver_id=eq.${userId} AND message_type=eq.call_offer`,
        },
        (payload: { new: CallMessage }) => {
          const roomId = payload.new.room_id;

          router.push(`/messenger/${roomId}?incoming=1`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, router]);
}
