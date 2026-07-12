"use client";

import Link from "next/link";
import { useSupabase } from "@/context/SupabaseContext";
import { useState, useEffect } from "react";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  MusicalNoteIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export default function MobileAuthNav() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);

    supabase.auth.getSession().then(({ data }) => {
      setUid(data.session?.user?.id ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUid(session?.user?.id ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  if (!hydrated) {
    return (
      <div className="w-full bg-white border-b border-gray-200 px-4 py-2 text-gray-500 text-sm">
        Loading…
      </div>
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="relative w-full bg-white border-b border-gray-200 px-4 py-2 flex items-center">
      
      {/* ⭐ Centered Plaza Title */}
      <div className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900">
        <Link href="/plaza">Mman Plaza</Link>
      </div>

      {/* ⭐ Right-side navigation icons */}
      <div className="ml-auto flex items-center gap-4 text-gray-700">

        {/* 🎵 Sound Square */}
        <Link href="/sound-square">
          <MusicalNoteIcon className="w-6 h-6 hover:text-purple-600" />
        </Link>

        {/* 🎥 Vision Square */}
        <Link href="/vision-square">
          <VideoCameraIcon className="w-6 h-6 hover:text-purple-600" />
        </Link>

        {/* 🔔 Notifications */}
        <Link href="/notifications">
          <BellIcon className="w-6 h-6 hover:text-purple-600" />
        </Link>

        {/* 💬 Messenger */}
        <Link href="/messenger">
          <ChatBubbleLeftRightIcon className="w-6 h-6 hover:text-purple-600" />
        </Link>

        {/* ✏️ Composer */}
        <button
          onClick={() => router.push("/compose")}
          className="hover:text-purple-600"
        >
          <PencilSquareIcon className="w-6 h-6" />
        </button>

        {/* 👤 Auth Actions */}
        {!uid ? (
          <>
            <Link href="/signup">Sign Up</Link>
            <Link href="/login">Log In</Link>
          </>
        ) : (
          <>
            <Link href={`/profile/${uid}`}>My Profile</Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </div>
  );
}
