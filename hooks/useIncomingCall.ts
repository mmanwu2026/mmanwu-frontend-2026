"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useRouter } from "next/navigation";

interface CallMessage {
  room_id: string;
  sender_id: string;
  receiver_id: string;
  message_type: string;
  metadata: any;
}

export default function useIncomingCall() {
  const { supabase } = useSupabase();
  const router = useRouter();

  // ⭐ NEW — Supabase session identity
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      setAuthUserId(user?.id ?? null);
    }
    loadSession();
  }, [supabase]);

  // ⭐ Subscribe only when identity is known
  useEffect(() => {
    if (!authUserId) return;

    const channel = supabase
      .channel(`incoming-calls-${authUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload: { new: CallMessage }) => {
          const msg = payload.new;

          // ⭐ Manual filtering (Supabase Realtime v2)
          if (
            msg.receiver_id !== authUserId ||
            msg.message_type !== "call_offer"
          ) {
            return;
          }

          // ⭐ Callee receives the call instantly
          router.push(`/messenger/${msg.room_id}?incoming=1`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUserId, supabase, router]);
}
