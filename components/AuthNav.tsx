"use client";

import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { useSupabase } from "@/context/SupabaseContext";
import { useState, useEffect } from "react";

export default function AuthNav() {
  const supabase = useSupabase();
  const { user, loading } = useUser();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

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
      {!user ? (
        <div className="flex gap-4">
          <Link href="/signup" prefetch={false}>Sign Up</Link>
          <Link href="/login" prefetch={false}>Log In</Link>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* ⭐ Prefetch disabled to prevent /profile/undefined */}
          <Link href={`/profile/${user.id}`} prefetch={false}>
            My Profile
          </Link>

          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
}
