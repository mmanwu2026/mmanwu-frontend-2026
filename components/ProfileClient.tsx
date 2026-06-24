"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

export default function ProfileClient({ userId }: { userId: string }) {
  const supabase = useSupabase();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  console.log("🔵 Hydrated:", hydrated, "User:", user, "Loading:", userLoading);

  if (!hydrated || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <p className="text-zinc-200 text-sm">
        ProfileClient mounted with contexts. userId: {userId}
      </p>
    </div>
  );
}
