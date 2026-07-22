"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/app/context/SupabaseContext";
import SoundPostCard from "@/components/sound-square/SoundPostCard";
import type { CardSoundPost, SoundComment } from "@/app/sound-square/types";

type ReactionCounts = {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
};

type ReactionRow = {
  post_id: string;
  maskTier: number;
  value: number | null;
};

export default function SoundSquareIndex() {
  const { supabase } = useSupabase();
  const [recentPosts, setRecentPosts] = useState<CardSoundPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecent();
  }, []);

  async function loadRecent() {
    setLoading(true);

    // Load posts (flat, with privacy_type)
    const { data: rawPosts, error } = await supabase
      .from("sound_posts")
      .select(`
        id,
        title,
        audio_url,
        creator_id,
        created_at,
        spirit_score,
        positivity_ratio,
        automask,
        privacy_type,
        users:creator_id ( username, avatar_url )
      `)
      .order("created_at", { ascending: false })
      .limit(6);

    if (error || !rawPosts) {
      console.error(error);
      setLoading(false);
      return;
    }

    const postIds = rawPosts.map((p) => p.id);

    // Load reactions
    const { data: reactionsData } = await supabase
      .from("reactions")
      .select("post_id, maskTier, value")
      .eq("post_type", "sound")
      .in("post_id", postIds);

    const typedReactions = (reactionsData ?? []) as ReactionRow[];

    // Load shares
    const { data: shareRows } = await supabase
      .from("sound_post_shares")
      .select("post_id")
      .in("post_id", postIds);

    const safeShareRows = shareRows ?? [];

    // Load comments
    const { data: commentRows } = await supabase
      .from("sound_post_comments")
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

    // Merge everything
    const enriched = rawPosts.map((post: any) => {
      const postReactions = typedReactions.filter((r) => r.post_id === post.id);

      const counts: ReactionCounts = {
        mask1: postReactions.filter((r) => r.maskTier === 1).length,
        mask2: postReactions.filter((r) => r.maskTier === 2).length,
        mask3: postReactions.filter((r) => r.maskTier === 3).length,
        mask4: postReactions.filter((r) => r.maskTier === 4).length,
        mask5: postReactions.filter((r) => r.maskTier === 5).length,
        mask6: postReactions.filter((r) => r.maskTier === 6).length,
      };

      const spiritScore = postReactions.reduce(
        (sum, r) => sum + (r.maskTier ?? 0),
        0
      );

      const weightedPositive = postReactions
        .filter((r) => (r.value ?? 0) > 0)
        .reduce((sum, r) => sum + (r.value ?? 0), 0);

      const weightedTotal = Math.abs(spiritScore);
      const positivityRatio =
        weightedTotal > 0 ? weightedPositive / weightedTotal : 0.5;

      let autoMask = 2;
      if (spiritScore <= 20) autoMask = 2;
      else if (spiritScore <= 100) autoMask = 3;
      else if (spiritScore <= 200) autoMask = 4;
      else if (spiritScore <= 500) autoMask = 5;
      else autoMask = 6;

      const share_count = safeShareRows.filter(
        (s: any) => s.post_id === post.id
      ).length;

      const share_score = share_count * 5;

      const rawComments = (commentRows ?? []).filter(
        (c: any) => c.post_id === post.id
      );

      const comments: SoundComment[] = rawComments.map((c: any) => ({
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
        audio_url: post.audio_url,
        creator_id: post.creator_id,
        creator_name: post.users?.username ?? null,
        created_at: post.created_at,

        spirit_score: spiritScore,
        positivity_ratio: positivityRatio,
        automask: autoMask,

        privacy_type: post.privacy_type,

        users: {
          username: post.users?.username ?? "Unknown",
          avatar_url: post.users?.avatar_url ?? null,
        },

        reactions: counts,

        share_count,
        share_score,

        comments,
        comment_count,
      };
    });

    setRecentPosts(enriched);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      {/* Navigation */}
      <div className="mb-6 flex justify-between items-center">
        <Link href="/plaza" className="text-gray-600 hover:text-purple-600 transition">
          ← Plaza
        </Link>

        <Link
          href="/sound-square/create"
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500 text-white"
        >
          + Upload Sound
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Sound Square</h1>
      <p className="text-gray-600 mb-8">
        Explore beats, reactions, and trending audio moments shared by the community.
      </p>

      {/* Toggle */}
      <div className="flex gap-4 mb-6">
        <Link href="/sound-square/feed" className="font-semibold text-purple-700">
          Recent
        </Link>

        <Link href="/sound-square/trending" className="text-gray-600 hover:text-purple-700">
          Trending
        </Link>
      </div>

      {/* Recent Posts Preview */}
      <h2 className="text-xl font-semibold mb-4 text-purple-700">Recent Posts</h2>

      <div className="space-y-6">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading sounds…</p>
        ) : recentPosts.length > 0 ? (
          recentPosts.map((post) => <SoundPostCard key={post.id} post={post} />)
        ) : (
          <p className="text-gray-500 text-sm">No sound posts yet…</p>
        )}
      </div>

      {/* Main Links */}
      <div className="space-y-4 mt-10">
        <Link
          href="/sound-square/feed"
          className="block border border-gray-200 hover:border-purple-300 p-4 rounded-lg transition bg-white"
        >
          <h2 className="text-xl font-semibold text-purple-700 mb-1">Sound Feed</h2>
          <p className="text-gray-600 text-sm">
            See the latest uploads from creators across Sound Square.
          </p>
        </Link>

        <Link
          href="/sound-square/trending"
          className="block border border-gray-200 hover:border-purple-300 p-4 rounded-lg transition bg-white"
        >
          <h2 className="text-xl font-semibold text-purple-700 mb-1">Trending</h2>
          <p className="text-gray-600 text-sm">
            Discover the highest‑spirit and most reacted sound posts.
          </p>
        </Link>
      </div>
    </div>
  );
}
