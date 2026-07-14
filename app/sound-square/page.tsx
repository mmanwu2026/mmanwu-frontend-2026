"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/app/context/SupabaseContext";
import SoundPostCard from "@/components/sound-square/SoundPostCard";
import TopBar from "@/components/navigation/TopBar";
import type { ReactionCounts, CardSoundPost } from "@/app/sound-square/types";

export default function SoundSquareIndex() {
  const { supabase } = useSupabase();
  const [recentPosts, setRecentPosts] = useState<CardSoundPost[]>([]);

  useEffect(() => {
    async function loadRecent() {
      const { data, error } = await supabase
        .from("sound_posts")
        .select(`
          id,
          title,
          media_url,
          audio_url,
          creator_id,
          created_at,
          share_count,
          share_score,

          users:creator_id (
            username,
            avatar_url
          ),

          comments:sound_post_comments (
            id,
            content,
            created_at,
            user_id,
            profiles:user_id (
              username,
              avatar_url
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error || !data) return;

      const normalized = data.map((post: any) => {
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
              created_at: c.created_at,
              user_id: c.user_id,
              profiles: {
                username: profile?.username ?? "unknown",
                avatar_url: profile?.avatar_url ?? null,
              },
            };
          }) ?? [];

        return {
          id: post.id,
          title: post.title,
          media_url: post.media_url,
          audio_url: post.audio_url,
          creator_id: post.creator_id,
          created_at: post.created_at,

          // ⭐ REQUIRED BY SoundPostCard
          share_count: post.share_count ?? 0,
          share_score: post.share_score ?? 0,

          users: {
            username: creator?.username ?? "unknown",
            avatar_url: creator?.avatar_url ?? null,
          },

          creator_name: creator?.username ?? "unknown",
          creator_avatar: creator?.avatar_url ?? null,

          comments,
          comment_count: comments.length,

          // ⭐ Default values until reactions are loaded
          spirit_score: 0,
          positivity_ratio: 0.5,
          automask: 2,

          reactions: {
            mask1: 0,
            mask2: 0,
            mask3: 0,
            mask4: 0,
            mask5: 0,
            mask6: 0,
          },

          total_reactions: 0,
        } as CardSoundPost;
      });

      // ⭐ Enrich with reactions
      const enriched: CardSoundPost[] = [];

      for (const post of normalized) {
        const { data: reactionRows } = await supabase
          .from("reactions")
          .select('maskTier')
          .eq("post_id", post.id)
          .eq("post_type", "sound");

        const rows = reactionRows ?? [];

        const counts: ReactionCounts = {
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
          total_reactions: total,
          spirit_score: spirit,
          positivity_ratio: positivity,
          automask: autoMask,
        });
      }

      setRecentPosts(enriched);
    }

    loadRecent();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <TopBar />

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

      <div className="flex gap-4 mb-6">
        <Link href="/sound-square/feed" className="font-semibold text-purple-700">
          Recent
        </Link>

        <Link href="/sound-square/trending" className="text-gray-600 hover:text-purple-700">
          Trending
        </Link>
      </div>

      <h2 className="text-xl font-semibold mb-4 text-purple-700">Recent Posts</h2>

      <div className="space-y-6">
        {recentPosts.map((post) => (
          <SoundPostCard key={post.id} post={post} />
        ))}
      </div>

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
