"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";

export default function Header() {
  const { supabase } = useSupabase();

  // ⭐ FIXED — authenticated user
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUid(session.data.session?.user?.id || null);
    }
    loadUser();
  }, [supabase]);

  return (
    <header className="w-full flex justify-between items-center px-4 py-4 mb-6 bg-white shadow-sm">
      <Link href="/" className="text-xl font-bold text-black">
        Mman Plaza
      </Link>

      {uid && (
        <Link
          href={`/creator/${uid}`}
          className="text-sm text-blue-600 hover:underline"
        >
          My Profile
        </Link>
      )}
    </header>
  );
}
