"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useUnread } from "@/app/context/UnreadContext";

export default function UnreadListener() {
  const { supabase } = useSupabase();
  const { setUnreadCounts } = useUnread();

  // ⭐ FIXED — authenticated user
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUid(session.data.session?.user?.id || null);
    }
    loadUser();
  }, [supabase]);

  useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel("global-plaza-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: { new: any }) => {
          const msg = payload.new;

          // Ignore messages sent by the user
          if (msg.sender_id === uid) return;

          // Ignore messages already seen
          if (msg.seen_at !== null) return;

          // Increment unread count
          setUnreadCounts((prev: Record<string, number>) => ({
            ...prev,
            [msg.room_id]: (prev[msg.room_id] || 0) + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, supabase, setUnreadCounts]);

  return null;
}
