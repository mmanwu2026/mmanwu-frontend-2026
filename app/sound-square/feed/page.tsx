"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import SoundPostCard, {
  CardSoundPost,
} from "@/components/sound-square/SoundPostCard";

type ReactionCounts = {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
};

type RawSoundPost = {
  id: string;
  title: string;
  audio_url: string;
  creator_id: string;
  created_at: string;
  spirit_score: number;
  users?: { username: string | null } | null;
};

const PAGE_SIZE = 20;

export default function SoundSquareFeed() {
  const supabase = createSupabaseBrowserClient();

  const [posts, setPosts] = useState<CardSoundPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    setLoading(true);

    const { data, error } = await supabase
      .from("sound_posts")
      .select(`
        *,
        users:creator_id ( username )
      `)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error || !data) {
      console.error(error);
      setLoading(false);
      return;
    }

    const merged = await mergeWithReactions(data as RawSoundPost[]);
    setPosts(merged);

    if (data.length > 0) setCursor(data[data.length - 1].created_at);
    if (data.length < PAGE_SIZE) setHasMore(false);

    setLoading(false);
  }

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || !hasMore) return;

    setLoadingMore(true);

    const { data, error } = await supabase
      .from("sound_posts")
      .select(`
        *,
        users:creator_id ( username )
      `)
      .lt("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error || !data) {
      console.error(error);
      setLoadingMore(false);
      return;
    }

    if (data.length === 0) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    const merged = await mergeWithReactions(data as RawSoundPost[]);
    setPosts((prev) => [...prev, ...merged]);

    setCursor(data[data.length - 1].created_at);
    if (data.length < PAGE_SIZE) setHasMore(false);

    setLoadingMore(false);
  }, [cursor, loadingMore, hasMore, supabase]);

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

  async function mergeWithReactions(
    rawPosts: RawSoundPost[]
  ): Promise<CardSoundPost[]> {
    const postIds = rawPosts.map((p) => p.id);

    const { data: reactionsData } = await supabase
      .from("sound_reactions")
      .select("post_id, maskTier, value")
      .in("post_id", postIds);

    return rawPosts.map((post) => {
      const postReactions = (reactionsData ?? []).filter(
        (r) => r.post_id === post.id
      );

      const counts: ReactionCounts = {
        mask1: postReactions.filter((r) => r.maskTier === 1).length,
        mask2: postReactions.filter((r) => r.maskTier === 2).length,
        mask3: postReactions.filter((r) => r.maskTier === 3).length,
        mask4: postReactions.filter((r) => r.maskTier === 4).length,
        mask5: postReactions.filter((r) => r.maskTier === 5).length,
        mask6: postReactions.filter((r) => r.maskTier === 6).length,
      };

      const spiritScore = post.spirit_score ?? 0;

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

      return {
        id: post.id,
        title: post.title,
        audio_url: post.audio_url,
        creator_name: post.users?.username ?? "Unknown",
        created_at: post.created_at,

        reactions: counts,
        spiritScore,
        positivityRatio,
        autoMask,
      };
    });
  }

  return (
    <div className="min-h-screen text-white p-6">
      <h1 className="text-4xl font-bold mb-6">Sound Square Feed</h1>

      {loading && <p>Loading sounds...</p>}

      <div className="flex flex-col gap-6 mb-6">
        {posts.map((post) => (
          <SoundPostCard key={post.id} post={post} />
        ))}
      </div>

      {hasMore && (
        <div ref={loadMoreRef} className="h-10 flex justify-center items-center">
          {loadingMore && <p className="text-gray-400">Loading more...</p>}
        </div>
      )}

      {!hasMore && (
        <p className="text-gray-500 text-sm mt-4 text-center">
          You’ve reached the end of the feed.
        </p>
      )}
    </div>
  );
}
