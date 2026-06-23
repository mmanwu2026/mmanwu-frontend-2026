"use client";

import { useEffect, useState, useCallback } from "react";
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

  // ⭐ NEW: HARD BLOCK until user is known
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading session…</p>
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  const resolvedId = params.userId === "me" ? user.id : params.userId;

  useEffect(() => {
    loadProfile(resolvedId);
  }, [resolvedId]);

  const loadProfile = async (id: string) => {
    setFetching(true);

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    setProfile(userData);

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("creator_id", id)
      .order("created_at", { ascending: false });

    setPosts(postsData ?? []);
    setFetching(false);
  };

  if (fetching) {
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
      {/* your UI unchanged */}
    </div>
  );
}
