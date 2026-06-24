"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

export default function ProfileClient({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = useSupabase();
  const { user, loading } = useUser();

  // ⭐ INSERTED LOG HERE
  console.log("AUTH USER:", user);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [fetching, setFetching] = useState(true);

  // ⭐ SAFE REDIRECT — prevents freeze on dynamic routes
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // ⭐ While redirecting or waiting for user, show a stable UI
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Redirecting…</p>
      </div>
    );
  }

  if (loading || !supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  const actualUserId = userId === "me" ? user.id : userId;

  if (!actualUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

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
      {/* your UI */}
    </div>
  );
}
