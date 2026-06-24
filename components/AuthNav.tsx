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

  // ⭐ Always render the SAME HTML on server and client
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
          <Link href="/signup">Sign Up</Link>
          <Link href="/login">Log In</Link>
        </div>
      ) : (
        <div className="flex gap-4">
          <Link href={`/profile/${user.id}`}>My Profile</Link>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
}
