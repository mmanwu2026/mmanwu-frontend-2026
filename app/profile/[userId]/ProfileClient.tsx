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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Redirecting…</p>
      </div>
    );
  }

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;

    const actualUserId = userId === "me" ? user.id : userId;

    if (!actualUserId) return;

    async function load() {
      try {
        setFetching(true);

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", actualUserId)
          .maybeSingle();

        console.log("QUERY USER DATA:", userData, "ERROR:", userError);

        setProfile(userData);

        const { data: postsData, error: postsError } = await supabase
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
  }, [user, userId, supabase]); // ⭐ userId instead of actualUserId

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
