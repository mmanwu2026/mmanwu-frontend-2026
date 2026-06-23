"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import ReactionBar from "@/components/plaza/ReactionBar";

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const supabase = useSupabase();
  const { user, loading } = useUser();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [fetching, setFetching] = useState(true);

  // ⭐ Hydration guard — do NOT proceed until UserProvider is ready
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  // ⭐ If user is not logged in after hydration → redirect
  if (!user) {
    router.replace("/login");
    return null;
  }

  // ⭐ Resolve the actual ID AFTER hydration
  const actualUserId = params.userId === "me" ? user.id : params.userId;

  // ⭐ If params haven't hydrated yet, wait
  if (!actualUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  // ⭐ Load profile ONCE when actualUserId becomes stable
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

  // ⭐ Still fetching? Show loader
  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  // ⭐ No profile found
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
