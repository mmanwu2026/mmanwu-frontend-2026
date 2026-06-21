"use client";

import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabase-browser";   // ✅ FIXED

export default function AuthNav() {
  const { user, loading } = useUser();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) return null;

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
          <Link
            href={`/profile/${user.id}`}
            className="hover:underline"
          >
            My Profile
          </Link>

          <button
            onClick={handleLogout}
            className="hover:underline"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
