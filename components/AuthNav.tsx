"use client";

import Link from "next/link";
import { useSupabase } from "@/context/SupabaseContext";
import { useState, useEffect } from "react";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";

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
    <div className="w-full bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      {/* Left side: App name */}
      <Link href="/plaza" className="text-lg font-semibold text-gray-900">
        Mman Plaza
      </Link>

      {/* Right side: Auth actions */}
      {!uid ? (
        <div className="flex gap-4 text-purple-600 text-sm font-medium">
          <Link href="/signup" prefetch={false}>Sign Up</Link>
          <Link href="/login" prefetch={false}>Log In</Link>
        </div>
      ) : (
        <div className="flex gap-4 text-purple-600 text-sm font-medium">
          <Link href={`/profile/${uid}`} prefetch={false}>
            My Profile
          </Link>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </div>
  );
}
