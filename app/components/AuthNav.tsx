"use client";

import Link from "next/link";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useState, useEffect } from "react";
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

  // ⭐ PAGE THEMES (still supported)
  const theme =
    pathname.startsWith("/sound-square")
      ? "bg-teal-600 text-white border-teal-700"
      : pathname.startsWith("/vision-square")
      ? "bg-blue-600 text-white border-blue-700"
      : pathname.startsWith("/messenger")
      ? "bg-green-600 text-white border-green-700"
      : pathname.startsWith("/compose")
      ? "bg-pink-600 text-white border-pink-700"
      : "bg-purple-600 text-white border-purple-700"; // default plaza

  return (
    <div
      className="w-full not-prose"
      style={{
        isolation: "auto",
        position: "relative",
        zIndex: 9999,
      }}
    >
      <div
        className={`sticky top-0 w-full px-4 py-2 flex items-center justify-between border-b ${theme}`}
        style={{
          isolation: "auto",
          position: "sticky",
          zIndex: 9999,
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
        }}
      >

        {/* LEFT SIDE — empty spacer to allow perfect centering */}
        <div className="w-12"></div>

        {/* CENTER — MMAN PLAZA logo/title */}
        <div className="text-lg font-semibold text-center flex-1">
          <Link href="/plaza">MMAN PLAZA</Link>
        </div>

        {/* RIGHT SIDE — Auth only */}
        <div className="flex items-center gap-4 font-medium w-12 justify-end">
          {!uid ? (
            <>
              <Link href="/login">Log In</Link>
            </>
          ) : (
            <>
              <Link href={`/profile/${uid}`}>Profile</Link>
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
