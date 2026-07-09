"use client";

import Link from "next/link";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { supabase } = useSupabase();

  const [uid, setUid] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load authenticated user
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
    }
    loadUser();
  }, [supabase]);

  // Load unread notifications
  useEffect(() => {
    async function loadUnread() {
      if (!uid) return;

      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", uid)
        .eq("read", false);

      setUnreadCount(data?.length || 0);
    }

    loadUnread();
  }, [uid, supabase]);

  // Real-time updates
  useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel(`notifications:user_${uid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        () => setUnreadCount((prev) => prev + 1)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [uid, supabase]);

  return (
    <nav className="flex items-center justify-between p-4 bg-black text-white border-b border-white/10">
      
      {/* ⭐ FIXED — MMAN now goes to Plaza */}
      <Link href="/plaza" className="text-lg font-bold">
        MMAN
      </Link>

      <div className="flex items-center gap-6 text-sm">

        {/* ⭐ Sound */}
        <Link href="/sound">Sound</Link>

        {/* ⭐ Vision */}
        <Link href="/vision">Vision</Link>

        {/* ⭐ Messenger */}
        <Link href="/messenger">Messenger</Link>

        {/* ⭐ Notifications */}
        <Link href="/notifications" className="relative">
          Notifications

          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}
