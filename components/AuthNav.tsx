"use client";

import Link from "next/link";
import { useSupabase } from "@/context/SupabaseContext";
import { useState, useEffect } from "react";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { BellIcon } from "@heroicons/react/24/outline";

export default function MobileAuthNav() {
  const { supabase } = useSupabase();

  const [uid, setUid] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setUid(data.session?.user?.id ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        setUid(session?.user?.id ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
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
      
      {/* ⭐ Centered Logo / Title */}
      <div className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900">
        <Link href="/plaza">Mman Plaza</Link>
      </div>

      {/* ⭐ Right-side actions */}
      <div className="ml-auto flex items-center gap-4 text-purple-600 text-sm font-medium">

        {/* Notification Bell */}
        <Link href="/notifications" className="text-gray-700">
          <BellIcon className="w-6 h-6" />
        </Link>

        {/* Auth Actions */}
        {!uid ? (
          <>
            <Link href="/signup" prefetch={false}>Sign Up</Link>
            <Link href="/login" prefetch={false}>Log In</Link>
          </>
        ) : (
          <>
            <Link href={`/profile/${uid}`} prefetch={false}>
              My Profile
            </Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </div>
  );
}
