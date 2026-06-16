"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useRouter } from "next/navigation";
import ReactionBar from "@/components/ReactionBar";

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const userId = params.userId;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      // 1. Check session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      // 2. Fetch profile (CORRECT COLUMN: id)
      const { data: userData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
      }

      setProfile(userData);

      // 3. Fetch posts (CORRECT COLUMNS: creator_id, created_at)
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error("Posts fetch error:", postsError);
      }

      setPosts(postsData || []);
      setLoading(false);
    }

    loadProfile();
  }, [userId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading profile...</p>
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
      {/* Profile Header */}
      <div className="max-w-2xl mx-auto mb-8 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl">
            {profile.username?.charAt(0).toUpperCase()}
          </div>

          <div>
            <h1 className="text-2xl font-semibold">{profile.username}</h1>
            <p className="text-zinc-400 text-sm">{profile.bio || "No bio yet."}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4 text-sm">
          <div>
            <span className="font-semibold">{profile.spirit_score}</span>{" "}
            <span className="text-zinc-400">Spirit Score</span>
          </div>

          <div>
            <span className="font-semibold">{profile.mask_tier}</span>{" "}
            <span className="text-zinc-400">Mask Tier</span>
          </div>

          <div>
            <span className="font-semibold">
              {Math.round((profile.positivity_ratio || 0) * 100)}%
            </span>{" "}
            <span className="text-zinc-400">Positivity</span>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-2xl mx-auto space-y-6">
        {posts.length === 0 && (
          <p className="text-zinc-500 text-center">No posts yet.</p>
        )}

        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl"
          >
            <p className="text-sm mb-3">{post.content}</p>

            <ReactionBar
              postId={post.id}
              creatorId={post.creator_id}   // FIXED
              reactions={{
                mask1: post.mask1 ?? 0,
                mask2: post.mask2 ?? 0,
                mask3: post.mask3 ?? 0,
                mask4: post.mask4 ?? 0,
                mask5: post.mask5 ?? 0,
              }}
              spiritScore={post.spirit_score ?? 0}
              positivityRatio={post.positivity_ratio ?? 0.5}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
