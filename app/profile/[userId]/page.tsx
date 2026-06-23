"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const supabase = useSupabase();
  const { user, loading } = useUser();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [fetching, setFetching] = useState(true);

  // ⭐ 1. Hydration guard — do NOT proceed until UserProvider is ready
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  // ⭐ 2. AFTER hydration, if no user → redirect
  if (!user) {
    router.replace("/login");
    return null;
  }

  // ⭐ 3. Only compute actualUserId AFTER hydration + user is known
  const actualUserId =
    params.userId === "me" ? user.id : params.userId;

  // ⭐ 4. If params haven't hydrated yet, wait
  if (!actualUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  // ⭐ 5. Load profile ONCE when actualUserId becomes stable
  useEffect(() => {
    async function load() {
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
      setFetching(false);
    }

    load();
  }, [actualUserId, supabase]);

  // ⭐ 6. Still fetching? Show loader
  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  // ⭐ 7. No profile found
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-red-400">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* your UI unchanged */}
    </div>
  );
}
