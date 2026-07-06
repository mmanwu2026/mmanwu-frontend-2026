"use client";

import Link from "next/link";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useEffect, useState } from "react";

export default function Navbar() {
  const supabase = useSupabase();
  const { user } = useUser();

  const [unreadCount, setUnreadCount] = useState(0);

  // ⭐ Load unread notifications
  useEffect(() => {
    async function loadUnread() {
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("read", false);

      setUnreadCount(data?.length || 0);
    }

    loadUnread();
  }, [user, supabase]);

  // ⭐ Real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:user_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => setUnreadCount((prev) => prev + 1)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, supabase]);

  return (
    <nav className="flex items-center justify-between p-4 bg-black text-white border-b border-white/10">
      <Link href="/" className="text-lg font-bold">
        MMANWU
      </Link>

      <Link href="/notifications" className="relative text-sm">
        Notifications

        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-3 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </Link>
    </nav>
  );
}
