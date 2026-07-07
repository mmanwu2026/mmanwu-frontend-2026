"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import Link from "next/link";
import VisionCard from "@/app/vision-square/components/VisionCard";

interface ReactionRow {
  maskTier: number;
}

export default function VisionSquareTrending() {
  const { supabase } = useSupabase();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      setLoading(true);

      // ⭐ Load posts + comments + creator profile
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
          ),

          comments:vision_post_comments (
            id,
            content,
            raw_input,
            created_at,
            automask,
            positivity_ratio,
            user_id,
            profiles:user_id (
              username,
              avatar_url
            )
          )
        `)
        .order("spirit_score", { ascending: false })
        .limit(25);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      // ⭐ Normalize creator + comments
      const normalized = (data || []).map((post: any) => {
        const creator =
          Array.isArray(post.users) && post.users.length > 0
            ? post.users[0]
            : post.users;

        const comments =
          post.comments?.map((c: any) => {
            const profile =
              Array.isArray(c.profiles) && c.profiles.length > 0
                ? c.profiles[0]
                : c.profiles;

            return {
              id: c.id,
              content: c.content,
              raw_input: c.raw_input ?? null,
              created_at: c.created_at,
              automask: c.automask,
              positivity_ratio: c.positivity_ratio ?? 0.5,
              user_id: c.user_id,
              profiles: {
                username: profile?.username ?? "unknown",
                avatar_url: profile?.avatar_url ?? null,
              },
            };
          }) ?? [];

        return {
          ...post,
          users: {
            username: creator?.username ?? "unknown",
            avatar_url: creator?.avatar_url ?? null,
          },
          comments,
          comment_count: comments.length,
        };
      });

      // ⭐ Recalculate reactions + positivity + automask
      const enriched = [];

      for (const post of normalized) {
        const { data: reactionRows } = await supabase
          .from("reactions")
          .select('post_id, "maskTier"')
          .eq("post_id", post.id)
          .eq("post_type", "vision");

        const rows: ReactionRow[] = reactionRows ?? [];

        const counts = {
          mask1: rows.filter((r) => r.maskTier === 1).length,
          mask2: rows.filter((r) => r.maskTier === 2).length,
          mask3: rows.filter((r) => r.maskTier === 3).length,
          mask4: rows.filter((r) => r.maskTier === 4).length,
          mask5: rows.filter((r) => r.maskTier === 5).length,
          mask6: rows.filter((r) => r.maskTier === 6).length,
        };

        const total = rows.length;
        const positiveCount = rows.filter((r) => r.maskTier >= 3).length;
        const positivity = total > 0 ? positiveCount / total : 0.5;

        const spirit = rows.reduce((sum, r) => sum + r.maskTier, 0);

        let autoMask = 2;
        if (spirit > 20) autoMask = 3;
        if (spirit > 100) autoMask = 4;
        if (spirit > 300) autoMask = 5;
        if (spirit > 500) autoMask = 6;

        enriched.push({
          ...post,
          reactions: counts,
          spirit_score: spirit,
          positivity_ratio: positivity,
          automask: autoMask,
          total_reactions: total,
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
        <VisionCard
          key={`${post.id}-${post.total_reactions}-${post.comment_count}`}
          post={post}
        />
      ))}
    </div>
  );
}
