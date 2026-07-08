"use client";

import Link from "next/link";
import { useSupabase } from "@/context/SupabaseContext";
import { useState, useEffect } from "react";

export default function AuthNav({ userId }: { userId: string | null }) {

  const { supabase } = useSupabase();

  const [hydrated, setHydrated] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);

    async function loadUser() {
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user?.id ?? null;
      setUid(userId);
    }

    loadUser();
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
