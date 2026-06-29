"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import Link from "next/link";
import VisionCard from "@/app/vision-square/components/VisionCard";

export default function VisionSquareTrending() {
  const supabase = useSupabase();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      setLoading(true);

      const { data, error } = await supabase
        .from("vision_posts")
        .select(`
          id,
          title,
          media_url,
          creator_id,
          created_at,
          spirit_score,
          positivity_ratio,
          automask,
          tags,
          users:creator_id (
            username,
            avatar_url
          )
        `)
        .order("spirit_score", { ascending: false })
        .limit(25);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      // Normalize relationship arrays
      const normalized = (data || []).map((post: any) => ({
        ...post,
        users: Array.isArray(post.users) ? post.users[0] : post.users,
      }));

      // Fetch reactions for each post
      const enriched = [];
      for (const post of normalized) {
        const { data: reactionRows } = await supabase
          .from("reactions")
          .select('post_id, "maskTier"')
          .eq("post_id", post.id)
          .eq("post_type", "vision");

        const counts = {
          mask1: reactionRows?.filter((r: { maskTier: number }) => r.maskTier === 1).length ?? 0,
          mask2: reactionRows?.filter((r: { maskTier: number }) => r.maskTier === 2).length ?? 0,
          mask3: reactionRows?.filter((r: { maskTier: number }) => r.maskTier === 3).length ?? 0,
          mask4: reactionRows?.filter((r: { maskTier: number }) => r.maskTier === 4).length ?? 0,
          mask5: reactionRows?.filter((r: { maskTier: number }) => r.maskTier === 5).length ?? 0,
          mask6: reactionRows?.filter((r: { maskTier: number }) => r.maskTier === 6).length ?? 0,
        };

        enriched.push({
          ...post,
          reactions: counts,
        });
      }

      setPosts(enriched);
      setLoading(false);
    }

    fetchTrending();
  }, [supabase]);

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">

      {/* Navigation */}
      <div className="mb-6 flex justify-between items-center">
        <Link
          href="/plaza"
          className="text-gray-300 hover:text-purple-300 transition"
        >
          ← Plaza
        </Link>

        <Link
          href="/vision-square/create"
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
        >
          + Upload Vision
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Trending on Vision Square</h1>

      {loading && <p className="text-gray-400">Loading trending posts…</p>}

      {!loading && posts.length === 0 && (
        <p className="text-gray-500">No trending posts yet.</p>
      )}

      {posts.map((post) => (
        <VisionCard key={post.id} post={post} />
      ))}
    </div>
  );
}
