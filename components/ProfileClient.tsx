"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

export default function ProfileClient({ userId }: { userId: string }) {
  const supabase = useSupabase();
  const { user, loading } = useUser();
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Hydration guard
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Redirect AFTER hydration + AFTER hooks
  useEffect(() => {
    if (hydrated && !loading && !user) {
      router.replace("/login");
    }
  }, [hydrated, loading, user, router]);

  // ⭐ Prevent undefined Supabase queries
  useEffect(() => {
    if (!hydrated) return;
    if (!userId) return; // <--- THE FIX

    async function load() {
      setLoadingProfile(true);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("users")
        .select("id, username, avatar_url")
        .eq("id", userId)
        .single();

      setProfile(profileData);

      // Fetch posts
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, content, created_at")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false });

      setPosts(postsData || []);
      setLoadingProfile(false);
    }

    load();
  }, [hydrated, supabase, userId]);

  // -----------------------------
  // SAFE CONDITIONAL RENDERING
  // -----------------------------

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Redirecting…</p>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Profile not found.</p>
      </div>
    );
  }

  // -----------------------------
  // MAIN RENDER
  // -----------------------------
  return (
    <div className="max-w-2xl mx-auto p-6 text-white">
      <div className="flex items-center gap-4 mb-6">
        <img
          src={profile.avatar_url || "/default-avatar.png"}
          alt="Avatar"
          className="w-16 h-16 rounded-full"
        />
        <h1 className="text-2xl font-bold">{profile.username}</h1>
      </div>

      <h2 className="text-xl font-semibold mb-4">Posts</h2>

      {posts.length === 0 ? (
        <p className="text-zinc-400">No posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="p-4 bg-zinc-900 rounded-lg border border-zinc-800"
            >
              <p>{post.content}</p>
              <p className="text-xs text-zinc-500 mt-2">
                {new Date(post.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
