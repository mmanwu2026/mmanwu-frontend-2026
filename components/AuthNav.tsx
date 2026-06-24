"use client";

import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { useSupabase } from "@/context/SupabaseContext";

export default function AuthNav() {
  const supabase = useSupabase();
  const { user, loading } = useUser();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // ⭐ SAFE HYDRATION: never return null
  if (loading) {
    return (
      <nav className="w-full flex justify-end p-4 text-white">
        <div className="text-zinc-400 text-sm">Loading…</div>
      </nav>
    );
  }

  return (
    <nav className="w-full flex justify-end p-4 text-white">
      {!user ? (
        <div className="flex gap-4">
          <Link href="/signup" className="hover:underline">
            Sign Up
          </Link>
          <Link href="/login" className="hover:underline">
            Log In
          </Link>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* ⭐ FIXED: prevent hydration crash by guarding user.id */}
          {user && (
            <Link href={`/profile/${user.id}`} className="hover:underline">
              My Profile
            </Link>
          )}

          <button onClick={handleLogout} className="hover:underline">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
