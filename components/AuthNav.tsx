"use client";

import Link from "next/link";
import { useSupabase } from "@/context/SupabaseContext";
import { useState, useEffect } from "react";
import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  MusicalNoteIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import { useRouter, usePathname } from "next/navigation";

export default function MobileAuthNav() {
  const { supabase } = useSupabase();
  const router = useRouter();

  // ⭐ FIX: pathname normalized to empty string (no TS errors)
  const pathname = usePathname() ?? "";

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

  // ⭐ PAGE‑SPECIFIC COLOR THEMES (TS‑SAFE)
  const theme =
    pathname.startsWith("/sound-square")
      ? "bg-teal-600 text-white border-teal-700"
      : pathname.startsWith("/vision-square")
      ? "bg-blue-600 text-white border-blue-700"
      : pathname.startsWith("/messenger")
      ? "bg-green-600 text-white border-green-700"
      : pathname.startsWith("/notifications")
      ? "bg-amber-600 text-white border-amber-700"
      : pathname.startsWith("/compose")
      ? "bg-pink-600 text-white border-pink-700"
      : "bg-purple-600 text-white border-purple-700"; // default plaza

  return (
    <div className="w-full">
      <div
        className={`sticky top-0 z-[5000] w-full px-4 py-2 flex items-center border-b ${theme}`}
      >
        {/* LEFT SIDE ICONS */}
        <div className="flex items-center gap-4">
          <Link href="/sound-square">
            <MusicalNoteIcon className="w-6 h-6 hover:opacity-80" />
          </Link>

          <Link href="/vision-square">
            <VideoCameraIcon className="w-6 h-6 hover:opacity-80" />
          </Link>

          <Link href="/notifications">
            <BellIcon className="w-6 h-6 hover:opacity-80" />
          </Link>

          <Link href="/messenger">
            <ChatBubbleLeftRightIcon className="w-6 h-6 hover:opacity-80" />
          </Link>

          <button
            onClick={() => router.push("/compose")}
            className="hover:opacity-80"
          >
            <PencilSquareIcon className="w-6 h-6" />
          </button>
        </div>

        {/* CENTER TITLE */}
        <div className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">
          <Link href="/plaza">Mman Plaza</Link>
        </div>

        {/* RIGHT SIDE AUTH */}
        <div className="ml-auto flex items-center gap-4 font-medium">
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
    </div>
  );
}
