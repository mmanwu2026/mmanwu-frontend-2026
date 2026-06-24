"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

export default function ProfileClient({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = useSupabase();
  const { user, loading } = useUser();

  console.log("AUTH USER:", user);

  // ⭐ 1. Wait until user is fully loaded
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  // ⭐ 2. If user is still null AFTER loading, redirect
  if (!user) {
    router.replace("/login");
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Redirecting…</p>
      </div>
    );
  }

  // ⭐ 3. Now safe to compute actualUserId
  const actualUserId = userId === "me" ? user.id : userId;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [fetching, setFetching] = useState(true);

  // ⭐ 4. Load profile + posts
  useEffect(() => {
    async function load() {
      try {
        setFetching(true);

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", actualUserId)
          .maybeSingle();

        console.log("QUERY USER DATA:", userData, "ERROR:", userError);

        if (userError) console.error("❌ Supabase USER error:", userError);

        setProfile(userData);

        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select("*")
          .eq("creator_id", actualUserId)
          .order("created_at", { ascending: false });

        if (postsError) console.error("❌ Supabase POSTS error:", postsError);

        setPosts(postsData ?? []);
      } catch (err) {
        console.error("❌ Unexpected ProfileClient error:", err);
      } finally {
        setFetching(false);
      }
    }

    load();
  }, [actualUserId, supabase]);

  // ⭐ 5. Show loading while fetching
  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  // ⭐ 6. No profile found
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
