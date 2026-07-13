"use client";

import Link from "next/link";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const FALLBACK_AVATAR =
  "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

export default function MobileAuthNav() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const [uid, setUid] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);

    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      setUid(user?.id ?? null);

      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_pixel")
          .eq("id", user.id)
          .single();

        setAvatarUrl(profile?.avatar_pixel ?? FALLBACK_AVATAR);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user;
        setUid(user?.id ?? null);

        if (user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_pixel")
            .eq("id", user.id)
            .single();

          setAvatarUrl(profile?.avatar_pixel ?? FALLBACK_AVATAR);
        }
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

  const theme =
    pathname.startsWith("/sound-square")
      ? "bg-teal-600 text-white border-teal-700"
      : pathname.startsWith("/vision-square")
      ? "bg-blue-600 text-white border-blue-700"
      : pathname.startsWith("/messenger")
      ? "bg-green-600 text-white border-green-700"
      : pathname.startsWith("/compose")
      ? "bg-pink-600 text-white border-pink-700"
      : "bg-purple-600 text-white border-purple-700";

  return (
    <div className={`sticky top-0 w-full z-[9999] ${theme}`}>
      <div className="px-4 py-2 flex items-center justify-between border-b border-white/20">

        {/* LEFT — MMAN PLAZA */}
        <div className="text-xl font-extrabold tracking-wide text-purple-200 drop-shadow-sm">
          <Link href="/plaza">MMAN PLAZA</Link>
        </div>

        {/* CENTER — Logo */}
        <div className="flex justify-center w-[40px]">
          <img
            src="/icons/icon-192x192.png"
            alt="MMAN Plaza Logo"
            className="w-[32px] h-[32px] inline-block align-middle"
          />
        </div>

        {/* RIGHT — Auth */}
        <div className="flex items-center gap-4 font-medium text-purple-100">

          {!uid ? (
            <Link href="/login" className="hover:opacity-80">
              Log In
            </Link>
          ) : (
            <>
              <Link href={`/profile/${uid}`}>
                <img
                  src={avatarUrl ?? FALLBACK_AVATAR}
                  alt="User Avatar"
                  className="w-[32px] h-[32px] rounded-full object-cover border border-purple-300 shadow-sm hover:opacity-80"
                />
              </Link>

              <button
                onClick={handleLogout}
                className="hover:opacity-80 text-purple-200"
              >
                Logout
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
