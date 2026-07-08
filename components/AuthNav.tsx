"use client";

import Link from "next/link";
import { useSupabase } from "@/context/SupabaseContext";
import { useState, useEffect } from "react";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";

export default function AuthNav() {
  const { supabase } = useSupabase();

  const [uid, setUid] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);

    // ⭐ Explicitly type the destructured data
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setUid(data.session?.user?.id ?? null);
    });

    // ⭐ Explicitly type event + session
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
      <nav className="w-full flex justify-end p-4 text-white">
        <div className="text-zinc-400 text-sm">Loading…</div>
      </nav>
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <nav className="w-full flex justify-end p-4 text-white">
      {!uid ? (
        <div className="flex gap-4">
          <Link href="/signup" prefetch={false}>Sign Up</Link>
          <Link href="/login" prefetch={false}>Log In</Link>
        </div>
      ) : (
        <div className="flex gap-4">
          <Link href={`/profile/${uid}`} prefetch={false}>
            My Profile
          </Link>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
}
