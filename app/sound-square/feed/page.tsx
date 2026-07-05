"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import SoundPostCard from "@/components/sound-square/SoundPostCard";
import TopBar from "@/components/navigation/TopBar";
import FeedToggle from "@/components/sound-square/FeedToggle";
import FloatingComposer from "@/components/sound-square/FloatingComposer";

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

type RawSoundPost = {
  id: string;
  title: string;
  audio_url: string;
  creator_id: string;
  creator_name: string | null;
  created_at: string;
  spirit_score: number;
  positivity_ratio: number;
  automask: number;
  users?: { username: string | null; avatar_url?: string | null } | null;
};

const PAGE_SIZE = 20;

export default function SoundSquareFeed() {
  const supabase = useSupabase();

  const [posts, setPosts] = useState<CardSoundPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // ⭐ REALTIME — new uploads appear instantly
  useEffect(() => {
    const channel = supabase
      .channel("sound-posts-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sound_posts",
        },
        () => {
          loadInitial(); // refresh feed when new sound is uploaded
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [supabase]);

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial(): Promise<void> {
    setLoading(true);

    const { data, error } = await supabase
      .from("sound_posts")
      .select(`
        id,
        title,
        audio_url,
        creator_id,
        creator_name,
        created_at,
        spirit_score,
        positivity_ratio,
        automask,
        users:creator_id ( username, avatar_url )
      `)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error || !data) {
      console.error(error);
      setLoading(false);
      return;
    }

    const typed = data as RawSoundPost[];
    const merged = await mergeWithReactionsAndComments(typed);
    setPosts(merged);

    if (typed.length > 0) setCursor(typed[typed.length - 1].created_at);
    if (typed.length < PAGE_SIZE) setHasMore(false);

    setLoading(false);
  }

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || !hasMore) return;

    setLoadingMore(true);

    const { data, error } = await supabase
      .from("sound_posts")
      .select(`
        id,
        title,
        audio_url,
        creator_id,
        creator_name,
        created_at,
        spirit_score,
        positivity_ratio,
        automask,
        users:creator_id ( username, avatar_url )
      `)
      .lt("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error || !data) {
      console.error(error);
      setLoadingMore(false);
      return;
    }

    const typed = data as RawSoundPost[];

    if (typed.length === 0) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    const merged = await mergeWithReactionsAndComments(typed);
    setPosts((prev) => [...prev, ...merged]);

    setCursor(typed[typed.length - 1].created_at);
    if (typed.length < PAGE_SIZE) setHasMore(false);

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

  async function mergeWithReactionsAndComments(rawPosts: RawSoundPost[]): Promise<CardSoundPost[]> {
    const postIds = rawPosts.map((p) => p.id);

    const { data: reactionsData } = await supabase
      .from("reactions")
      .select("post_id, maskTier, value")
      .eq("post_type", "sound")
      .in("post_id", postIds);

    const typedReactions = (reactionsData ?? []) as ReactionRow[];

    const { data: shareRows, error: shareError } = await supabase
      .from("sound_post_shares")
      .select("post_id")
      .in("post_id", postIds);

    const safeShareRows = shareError ? [] : shareRows ?? [];

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

      const spiritScore = post.spirit_score ?? 0;

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

      return {
        id: post.id,
        title: post.title,
        audio_url: post.audio_url,
        creator_id: post.creator_id,
        creator_name: post.creator_name,
        created_at: post.created_at,

        spirit_score: spiritScore,
        positivity_ratio: positivityRatio,
        automask: autoMask,

        users: {
          username: post.users?.username ?? post.creator_name ?? "Unknown",
          avatar_url: post.users?.avatar_url ?? null,
        },

        reactions: counts,

        share_count,
        share_score,

        comments,
        comment_count,
      };
    });
  }

  const handleDeleted = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen text-white p-6">
      <TopBar />
      <FeedToggle />

      <h1 className="text-4xl font-bold mb-6">Sound Square Feed</h1>

      {loading && <p>Loading sounds...</p>}

      <div className="flex flex-col gap-6 mb-6">
        {posts.map((post) => (
          <SoundPostCard
            key={post.id}
            post={{ ...post, onDeleted: handleDeleted }}
            isTrending={false}
          />
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

      <FloatingComposer />
    </div>
  );
}
