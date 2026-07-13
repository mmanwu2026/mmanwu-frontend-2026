"use client";

import Link from "next/link";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useState, useEffect } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { useRouter, usePathname } from "next/navigation";

export default function MobileAuthNav() {
  const { supabase } = useSupabase();
  const router = useRouter();
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

  return (
    <div className="w-full not-prose z-[9999]">
      <div
        className="sticky top-0 w-full px-4 py-3 flex items-center justify-between bg-purple-600 text-white border-b border-purple-700"
        style={{ WebkitTransform: "translateZ(0)", transform: "translateZ(0)" }}
      >
        {/* LEFT: Logo / Title */}
        <div className="text-lg font-semibold">
          <Link href="/plaza">MMAN PLAZA</Link>
        </div>

        {/* RIGHT: Notifications + Profile + Auth */}
        <div className="flex items-center gap-4 font-medium">
          <Link href="/notifications">
            <BellIcon className="w-6 h-6 hover:opacity-80" />
          </Link>

          {!uid ? (
            <>
              <Link href="/signup">Sign Up</Link>
              <Link href="/login">Log In</Link>
            </>
          ) : (
            <>
              <Link href={`/profile/${uid}`}>My Profile</Link>
              <button onClick={handleLogout} className="hover:opacity-80">
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
