"use client";

import Link from "next/link";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import { BellIcon, UserCircleIcon } from "@heroicons/react/24/outline";

export default function MobileHeader() {
  const { supabase } = useSupabase();

  const [uid, setUid] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
    }
    loadUser();
  }, [supabase]);

  useEffect(() => {
    if (!uid) return;

    async function loadUnread() {
      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", uid)
        .eq("read", false);

      setUnread(data?.length || 0);
    }

    loadUnread();
  }, [uid, supabase]);

  return (
    <header className="
  w-full px-4 py-3 bg-white border-b border-gray-200
  flex items-center justify-between
  z-[9000] relative
">
      <Link href="/plaza" className="text-xl font-bold text-gray-900">
        Mman Plaza
      </Link>

      <div className="flex items-center gap-4">

        {/* Notifications */}
        <Link href="/notifications" className="relative">
          <BellIcon className="w-6 h-6 text-gray-700" />
          {unread > 0 && (
            <span className="
              absolute -top-1 -right-1
              bg-red-600 text-white text-xs
              px-1.5 py-0.5 rounded-full
            ">
              {unread}
            </span>
          )}
        </Link>

        {/* Profile */}
        {uid && (
          <Link href={`/profile/${uid}`}>
            <UserCircleIcon className="w-7 h-7 text-gray-700" />
          </Link>
        )}
      </div>
    </header>
  );
}
