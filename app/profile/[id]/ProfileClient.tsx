"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

export default function ProfileClient({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = useSupabase();
  const { user, loading } = useUser();

  // ⭐ HYDRATION GUARD
  const hydrated = typeof window !== "undefined";
  if (!hydrated) return null;

  // ⭐ PREFETCH GUARD — only block undefined/null, NOT empty string
  if (userId === undefined || userId === null) {
    return null;
  }

  // ⭐ REDIRECT GUARD
  if (!loading && !user) {
    return null;
  }

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user) return;

    const actualUserId = userId === "me" ? user.id : userId;

    async function load() {
      try {
        setFetching(true);

        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", actualUserId)
          .maybeSingle();

        setProfile(userData);

        const { data: postsData } = await supabase
          .from("posts")
          .select("*")
          .eq("creator_id", actualUserId)
          .order("created_at", { ascending: false });

        setPosts(postsData ?? []);
      } finally {
        setFetching(false);
      }
    }

    load();
  }, [loading, user, userId, supabase]);

  // ⭐ CORRECT RENDER LOGIC
  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-red-400">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* your UI */}
    </div>
  );
}
