"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSupabase } from "./SupabaseContext";
import { useUser } from "./UserContext";

const UnreadContext = createContext<Record<string, number>>({});

// ⭐ Push Notification Helper
function showNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
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

  // ⭐ Load unread counts (chat only)
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

  // ⭐ FULL PLAZA REALTIME NOTIFICATIONS
  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const channel = supabase
      .channel("global-plaza-events")

      // ⭐ CHAT MESSAGES
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: { new: any }) => {
          const msg = payload.new;

          if (msg.sender_id === userId) return;
          if (msg.seen_at !== null) return;

          showNotification("New Message", msg.content);

          setUnreadCounts((prev) => ({
            ...prev,
            [msg.room_id]: (prev[msg.room_id] || 0) + 1,
          }));
        }
      )

      // ⭐ COMMENTS (notify post owner)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload: { new: any }) => {
          const c = payload.new;

          if (c.author_id === userId) return;
          if (c.post_owner_id !== userId) return;

          showNotification("New Comment", c.content);
        }
      )

      // ⭐ REACTIONS (notify post owner)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload: { new: any }) => {
          const r = payload.new;

          if (r.actor_id === userId) return;
          if (r.target_owner_id !== userId) return;

          showNotification("New Reaction", `${r.emoji} on your post`);
        }
      )

      // ⭐ UPLOADS (notify if author is followed — optional)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload: { new: any }) => {
          const p = payload.new;

          // Optional: only notify if user follows the author
          // if (!userFollows.has(p.author_id)) return;

          showNotification("New Upload", p.title ?? "New post in Plaza");
        }
      )

      // ⭐ FOLLOWS (notify when someone follows you)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "follows" },
        (payload: { new: any }) => {
          const f = payload.new;

          if (f.followed_id !== userId) return;

          showNotification("New Follower", "Someone just followed you");
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
