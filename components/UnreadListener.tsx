"use client";

import { useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useUnread } from "@/context/UnreadContext";

export default function UnreadListener() {
  const supabase = useSupabase();
  const { user } = useUser();
  const { setUnreadCounts } = useUnread();

  useEffect(() => {
    if (!user) return;

    const userId = user.id;

    const channel = supabase
      .channel("global-plaza-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: { new: any }) => {
          const msg = payload.new;

          if (msg.sender_id === userId) return;
          if (msg.seen_at !== null) return;

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
  }, [user, supabase, setUnreadCounts]);

  return null;
}
