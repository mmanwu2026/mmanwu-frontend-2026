"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import SoundPostCard from "@/components/sound-square/SoundPostCard";
import TopBar from "@/components/navigation/TopBar";
import type { CardSoundPost, SoundComment } from "@/app/sound-square/types";
import Link from "next/link";

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

type RawSoundPost = {
  id: string;
  title: string;
  audio_url: string;
  creator_id: string;
  created_at: string;
  spirit_score: number;
  positivity_ratio: number;
  automask: number;
  privacy_type: "public" | "private";
  users?: { username: string | null; avatar_url?: string | null } | null;
};

export default function TrendingSoundSquare() {
  const { supabase } = useSupabase();
  const [posts, setPosts] = useState<(CardSoundPost & { trending_score: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const [uid, setUid] = useState<string | null>(null);
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});

  // Load auth user
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
    }
    loadUser();
  }, [supabase]);

  useEffect(() => {
    loadTrending();
  }, [uid]);

  async function loadTrending() {
    setLoading(true);

    // Load posts with privacy_type
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
      .limit(50);

    if (error || !rawPosts) {
      console.error(error);
      setLoading(false);
      return;
    }

    const typedPosts = rawPosts as RawSoundPost[];
    const postIds = typedPosts.map((p) => p.id);

    // Load follow state for all creators
    if (uid) {
      const creatorIds = [...new Set(typedPosts.map((p) => p.creator_id))];

      const { data: followRows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", uid)
        .in("following_id", creatorIds);

      const map: Record<string, boolean> = {};
      followRows?.forEach((row) => {
        map[row.following_id] = true;
      });

      setFollowMap(map);
    }

    // Load reactions
    const { data: reactionsData } = await supabase
      .from("reactions")
      .select("post_id, maskTier, value")
      .eq("post_type", "sound")
      .in("post_id", postIds);

    const typedReactions = (reactionsData ?? []) as ReactionRow[];

    // Load shares
    const { data: shareRows, error: shareError } = await supabase
      .from("sound_post_shares")
      .select("post_id")
      .in("post_id", postIds);

    const safeShareRows = shareError ? [] : shareRows ?? [];

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
    const enriched = typedPosts
      .map((post: RawSoundPost) => {
        const isCreator = uid === post.creator_id;
        const isFollowing = followMap[post.creator_id] === true;

        const isAllowed =
          post.privacy_type === "public" ||
          isCreator ||
          isFollowing;

        if (!isAllowed) {
          return null;
        }

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
        const positivityRatio = weightedTotal > 0 ? weightedPositive / weightedTotal : 0.5;

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

        const trending_score =
          spiritScore +
          share_score +
          comment_count * 2 +
          positivityRatio * 10;

        return {
          id: post.id,
          title: post.title,
          audio_url: post.audio_url,
          creator_id: post.creator_id,
          creator_name: null,
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

          trending_score,
        };
      })
      .filter(Boolean) as (CardSoundPost & { trending_score: number })[];

    enriched.sort((a, b) => b.trending_score - a.trending_score);

    setPosts(enriched);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <TopBar />

      <h1 className="text-4xl font-bold mb-6">Trending Sounds</h1>

      {loading && <p>Loading trending sounds...</p>}

      <Link
        href="/sound-square"
        className="text-purple-600 hover:text-purple-700 underline mb-4 inline-block"
      >
        Back to Sound Square
      </Link>

      <div className="flex flex-col gap-6 mb-6">
        {posts.map((post) => (
          <SoundPostCard key={post.id} post={post} isTrending={true} />
        ))}
      </div>
    </div>
  );
}
