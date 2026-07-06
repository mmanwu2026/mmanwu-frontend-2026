"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSupabase } from "./SupabaseContext";
import { useUser } from "./UserContext";

const UnreadContext = createContext<Record<string, number>>({});

// ⭐ Push Notification Helper
function showNotification(title: string, body: string) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const { user } = useUser();

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // ⭐ Ask for notification permission once
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // ⭐ Load unread counts
  useEffect(() => {
    if (!user) return;

    async function loadUnread() {
      if (!user) return;
      const userId = user.id;

      const { data } = await supabase
        .from("messages")
        .select("room_id")
        .neq("sender_id", userId)
        .is("seen_at", null);

      const counts: Record<string, number> = {};

      data?.forEach((m: { room_id: string }) => {
        counts[m.room_id] = (counts[m.room_id] || 0) + 1;
      });

      setUnreadCounts(counts);
    }

    loadUnread();
  }, [user, supabase]);

  // ⭐ Realtime subscription + push notifications
  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const channel = supabase
      .channel("global-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: { new: any }) => {
          const msg = payload.new;

          if (msg.sender_id === userId) return;
          if (msg.seen_at !== null) return;

          // ⭐ Push notification
          showNotification("New Message", msg.content);

          // ⭐ Update unread counts
          setUnreadCounts((prev) => ({
            ...prev,
            [msg.room_id]: (prev[msg.room_id] || 0) + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  return (
    <UnreadContext.Provider value={unreadCounts}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
