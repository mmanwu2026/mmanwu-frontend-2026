"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import SoundPostCard from "@/components/sound-square/SoundPostCard";
import TopBar from "@/components/navigation/TopBar";
import type { CardSoundPost } from "@/app/sound-square/loadSoundPosts";

import FloatingComposer from "@/components/sound-square/FloatingComposer";
import FeedToggle from "@/components/sound-square/FeedToggle";

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
};

type RawSoundPost = {
  id: string;
  title: string;
  audio_url: string;
  creator_id: string;
  created_at: string;
  users?: { username: string | null; avatar_url?: string | null } | null;
};

const PAGE_SIZE = 20;

export default function SoundSquareTrending() {
  const supabase = useSupabase();

  const [posts, setPosts] = useState<CardSoundPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadTrending();
  }, []);

  async function loadTrending(): Promise<void> {
    setLoading(true);

    const { data, error } = await supabase
      .from("sound_posts")
      .select(`
        *,
        users:creator_id ( username, avatar_url )
      `)
      .order("created_at", { ascending: false }) // initial load
      .limit(PAGE_SIZE * 3); // load more for trending calculation

    if (error || !data) {
      console.error(error);
      setLoading(false);
      return;
    }

    const typed = data as RawSoundPost[];
    const merged = await mergeTrending(typed);

    // sort by trending score
    merged.sort((a, b) => b.trending_score - a.trending_score);

    setPosts(merged.slice(0, PAGE_SIZE));

    if (merged.length <= PAGE_SIZE) setHasMore(false);

    setLoading(false);
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    const { data, error } = await supabase
      .from("sound_posts")
      .select(`
        *,
        users:creator_id ( username, avatar_url )
      `)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE * 3);

    if (error || !data) {
      console.error(error);
      setLoadingMore(false);
      return;
    }

    const typed = data as RawSoundPost[];
    const merged = await mergeTrending(typed);

    merged.sort((a, b) => b.trending_score - a.trending_score);

    setPosts((prev) => [...prev, ...merged.slice(0, PAGE_SIZE)]);

    if (merged.length <= PAGE_SIZE) setHasMore(false);

    setLoadingMore(false);
  }, [loadingMore, hasMore, supabase]);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  async function mergeTrending(rawPosts: RawSoundPost[]): Promise<(CardSoundPost & { trending_score: number })[]> {
    const postIds = rawPosts.map((p) => p.id);

    const { data: reactionsData } = await supabase
      .from("reactions")
      .select("post_id, maskTier")
      .eq("post_type", "sound")
      .in("post_id", postIds);

    const typedReactions = (reactionsData ?? []) as ReactionRow[];

    return rawPosts.map((post) => {
      const postReactions = typedReactions.filter((r) => r.post_id === post.id);

      const counts: ReactionCounts = {
        mask1: postReactions.filter((r) => r.maskTier === 1).length,
        mask2: postReactions.filter((r) => r.maskTier === 2).length,
        mask3: postReactions.filter((r) => r.maskTier === 3).length,
        mask4: postReactions.filter((r) => r.maskTier === 4).length,
        mask5: postReactions.filter((r) => r.maskTier === 5).length,
        mask6: postReactions.filter((r) => r.maskTier === 6).length,
      };

      const total = postReactions.length;
      const positive = postReactions.filter((r) => r.maskTier >= 3).length;

      const spiritScore = postReactions.reduce(
        (sum, r) => sum + r.maskTier,
        0
      );

      const positivityRatio = total > 0 ? positive / total : 0.5;

      let autoMask = 2;
      if (spiritScore > 20) autoMask = 3;
      if (spiritScore > 100) autoMask = 4;
      if (spiritScore > 300) autoMask = 5;
      if (spiritScore > 500) autoMask = 6;

      // ⭐ Trending score formula
      const hoursSincePost =
        (Date.now() - new Date(post.created_at).getTime()) / 36e5;

      const velocity = hoursSincePost > 0 ? total / hoursSincePost : total;

      const trending_score =
        spiritScore * 1.5 +
        positivityRatio * 50 +
        velocity * 2 +
        autoMask * 10;

return {
  id: post.id,
  title: post.title,
  audio_url: post.audio_url,
  creator_id: post.creator_id,
  created_at: post.created_at,

  spirit_score: spiritScore,
  positivity_ratio: positivityRatio,
  automask: autoMask,

  // ⭐ REQUIRED FIELDS FOR CardSoundPost
  share_count: (post as any).share_count ?? 0,
  share_score: (post as any).share_score ?? 0,

  users: {
    username: post.users?.username ?? "Unknown",
    avatar_url: post.users?.avatar_url ?? null,
  },

  reactions: counts,

  trending_score,
};

    });
  }

  return (
    <div className="min-h-screen text-white p-6">
      <TopBar />
      <FeedToggle />

      <h1 className="text-4xl font-bold mb-6">Trending on Sound Square</h1>

      {loading && <p>Loading trending sounds...</p>}

      <div className="flex flex-col gap-6 mb-6">
        {posts.map((post) => (
          <SoundPostCard key={post.id} post={post} isTrending={true} />
        ))}
      </div>

      {hasMore && (
        <div ref={loadMoreRef} className="h-10 flex justify-center items-center">
          {loadingMore && <p className="text-gray-400">Loading more...</p>}
        </div>
      )}

      {!hasMore && (
        <p className="text-gray-500 text-sm mt-4 text-center">
          You’ve reached the end of trending sounds.
        </p>
      )}

      <FloatingComposer />
    </div>
  );
}
