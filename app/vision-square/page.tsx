"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/app/context/SupabaseContext";
import VisionCard from "@/app/vision-square/components/VisionCard";
import SafeRender from "../components/SafeRender";

type ReactionRow = {
  post_id: string;
  maskTier: number;
  value: number | null;
};

export default function VisionSquareIndex() {
  const { supabase } = useSupabase();

  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      setUid(data.session?.user?.id || null);
    }
    loadUser();
  }, [supabase]);

  useEffect(() => {
    if (uid !== undefined) loadRecent();
  }, [uid]);

  async function loadRecent() {
    setLoading(true);

    /* 1. Load posts */
    const { data: rawPosts, error } = await supabase
      .from("vision_posts")
      .select(`
        id,
        title,
        media_url,
        creator_id,
        created_at,
        privacy_type,
        users:creator_id ( username, avatar_url )
      `)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error || !rawPosts) {
      console.error(error);
      setLoading(false);
      return;
    }

    const postIds = rawPosts.map((p) => p.id);

    /* 2. Load reactions */
    const { data: reactionsData } = await supabase
      .from("reactions")
      .select("post_id, maskTier, value")
      .eq("post_type", "vision")
      .in("post_id", postIds);

    const typedReactions = (reactionsData ?? []) as ReactionRow[];

    /* 3. Load comments */
    const { data: commentRows } = await supabase
      .from("vision_post_comments")
      .select(`
        id,
        post_id,
        content,
        raw_input,
        created_at,
        automask,
        positivity_ratio,
        user_id,
        profiles:user_id ( username, avatar_url )
      `)
      .in("post_id", postIds)
      .order("created_at", { ascending: true });

    /* 4. Merge everything */
    const enriched = rawPosts.map((post: any) => {
      const postReactions = typedReactions.filter((r) => r.post_id === post.id);

      /* ⭐ Reaction counts by mask tier */
      const reactions = {
        mask1: postReactions.filter((r) => r.maskTier === 1).length,
        mask2: postReactions.filter((r) => r.maskTier === 2).length,
        mask3: postReactions.filter((r) => r.maskTier === 3).length,
        mask4: postReactions.filter((r) => r.maskTier === 4).length,
        mask5: postReactions.filter((r) => r.maskTier === 5).length,
        mask6: postReactions.filter((r) => r.maskTier === 6).length,
      };

      /* ⭐ Total reactions */
      const reaction_count = postReactions.length;

      /* ⭐ Spirit score */
      const spiritScore = postReactions.reduce(
        (sum, r) => sum + (r.maskTier ?? 0),
        0
      );

      /* ⭐ Positivity ratio */
      const weightedPositive = postReactions
        .filter((r) => (r.value ?? 0) > 0)
        .reduce((sum, r) => sum + (r.value ?? 0), 0);

      const weightedTotal = Math.abs(spiritScore);
      const positivityRatio =
        weightedTotal > 0 ? weightedPositive / weightedTotal : 0.5;

      /* ⭐ AutoMask */
      let autoMask = 2;
      if (spiritScore > 20) autoMask = 3;
      if (spiritScore > 100) autoMask = 4;
      if (spiritScore > 300) autoMask = 5;
      if (spiritScore > 500) autoMask = 6;

      /* ⭐ Comments */
      const rawComments = (commentRows ?? []).filter(
        (c: any) => c.post_id === post.id
      );

      const comments = rawComments.map((c: any) => ({
        id: c.id,
        content: c.content,
        raw_input: c.raw_input,
        created_at: c.created_at,
        automask: c.automask,
        positivity_ratio: c.positivity_ratio,
        user_id: c.user_id,
        profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
      }));

      const comment_count = comments.length;

      return {
        id: post.id,
        title: post.title,
        media_url: post.media_url,
        creator_id: post.creator_id,
        created_at: post.created_at,

        /* ⭐ Computed values */
        reactions,
        reaction_count,
        spirit_score: spiritScore,
        positivity_ratio: positivityRatio,
        automask: autoMask,

        privacy_type: post.privacy_type,

        users: {
          username: post.users?.username ?? "Unknown",
          avatar_url: post.users?.avatar_url ?? null,
        },

        comments,
        comment_count,
      };
    });

    setRecentPosts(enriched);
    setLoading(false);
  }

  /* ⭐ Reaction handler */
  async function handleVisionReaction(postId: string, maskTier: number) {
    if (!uid) return;

    await supabase.from("reactions").insert({
      post_id: postId,
      post_type: "vision",
      user_id: uid,
      maskTier,
    });

    await loadRecent(); // ⭐ refresh UI
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white text-gray-900">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/plaza" className="text-gray-600 hover:text-purple-600 transition">
          ← Plaza
        </Link>

        <Link
          href="/vision-square/create"
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500 text-white"
        >
          + Upload Vision
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Vision Square</h1>

      <p className="text-gray-600 mb-8">
        Explore visual stories, trending videos, and powerful moments shared by the community.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-4 text-purple-700">
        Recent Posts
      </h2>

      <div className="space-y-6">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading visions…</p>
        ) : recentPosts.length > 0 ? (
          recentPosts.map((post) => (
            <SafeRender key={post.id}>
              <VisionCard
                post={post}
                onReactAction={(maskTier) =>
                  handleVisionReaction(post.id, maskTier)
                }
              />
            </SafeRender>
          ))
        ) : (
          <p className="text-gray-500 text-sm">No vision posts yet…</p>
        )}
      </div>
    </div>
  );
}
