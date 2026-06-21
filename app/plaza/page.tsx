"use client";

import React, { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

import Sidebar from "@/components/plaza/Sidebar";
import ReactionBar from "@/components/plaza/ReactionBar";
import FloatingComposer from "@/components/plaza/FloatingComposer";
import { useUser } from "@/context/UserContext";

interface PlazaPost {
  id: string;
  creator_id: string;
  content: string;
  created_at: string;
  mask: number;
  spirit_score: number;
}

interface ReactionRow {
  post_id: string;
  maskTier: number;
  value: number | null;
}

interface ReactionCounts {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
}

interface PlazaPostWithAggregates extends PlazaPost {
  reactions: ReactionCounts;
  spiritScore: number;
  positivityRatio: number;
  autoMask: number;
}

const PAGE_SIZE = 20;

function auraIntensity(score: number, positivity: number) {
  let level =
    score < 6 ? 0 :
    score < 16 ? 1 :
    score < 31 ? 2 :
    score < 51 ? 3 :
    4;

  if (positivity > 0.6) level++;
  if (positivity < 0.3) level--;

  return Math.max(0, Math.min(4, level));
}

export default function PlazaPage() {
  const supabase = createSupabaseBrowserClient();
  const { user } = useUser();

  const [posts, setPosts] = useState<PlazaPostWithAggregates[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const prevPositivityMap = useRef<Record<string, number>>({});
  const prevPositiveReactionsMap = useRef<Record<string, number>>({});

  async function fetchPosts(pageToLoad: number = 0, append = false) {
    if (!append) setLoading(true);

    const from = pageToLoad * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (postsError || !postsData) {
      console.error("Error fetching posts:", postsError);
      if (!append) setPosts([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    const postIds = postsData.map((p) => p.id as string);
    if (postIds.length === 0) {
      if (!append) setPosts([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    const { data: reactionsData } = await supabase
      .from("reactions")
      .select("post_id, maskTier, value")
      .in("post_id", postIds);

    const merged: PlazaPostWithAggregates[] = postsData.map((post) => {
      const postReactions = (reactionsData ?? []).filter(
        (r: ReactionRow) => r.post_id === post.id
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

      // Positivity disabled for now
      const positivityRatio = 0.5;

      let autoMask = 2;
      if (spiritScore <= 20) autoMask = 2;
      else if (spiritScore <= 100) autoMask = 3;
      else if (spiritScore <= 200) autoMask = 4;
      else if (spiritScore <= 500) autoMask = 5;
      else autoMask = 6;

      return {
        ...post,
        reactions: counts,
        spiritScore,
        positivityRatio,
        autoMask,
      };
    });

    setPosts((prev) => (append ? [...prev, ...merged] : merged));

    if (postsData.length < PAGE_SIZE) setHasMore(false);

    if (!append) setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => {
    fetchPosts(0, false);
  }, []);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("plaza-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        () => fetchPosts(0, false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => fetchPosts(0, false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function handleLoadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchPosts(nextPage, true);
    setPage(nextPage);
  }

  async function handleDelete(postId: string) {
    if (!user) return;
    setDeletingId(postId);

    await supabase.from("posts").delete().eq("id", postId);

    setDeletingId(null);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  return (
    <div className="min-h-screen w-full bg-black text-gray-100">
      <Sidebar />

      <div className="absolute left-0 top-20 w-[120px] px-4 z-[5000]">
        <FloatingComposer onPost={() => fetchPosts(0, false)} />
      </div>

      <div className="flex">
        <div className="w-[120px] shrink-0" />

        <div className="flex-1 flex flex-col items-center pt-36 pb-40 px-4">
          <div className="w-full flex flex-col items-center mb-10">
            <h1 className="text-3xl font-bold text-purple-200 tracking-wide clean-plaza-header">
              Mmanwu Plaza (TEST)
            </h1>
            <div className="h-[1px] w-40 bg-purple-500/0 mt-3"></div>
          </div>

          {loading && <p className="text-gray-300">Loading posts…</p>}
          {!loading && posts.length === 0 && (
            <p className="text-gray-300">No posts yet…</p>
          )}

          <div className="space-y-12 w-full flex flex-col items-center">
            {posts.map((post) => {
              const key = post.id;

              const prevPos =
                prevPositivityMap.current[key] ?? post.positivityRatio;
              const prevPosReacts =
                prevPositiveReactionsMap.current[key] ?? post.reactions.mask3;

              const positivitySpike = post.positivityRatio - prevPos > 0.25;
              const newPositiveReaction = post.reactions.mask3 > prevPosReacts;

              const surge = positivitySpike || newPositiveReaction;

              prevPositivityMap.current[key] = post.positivityRatio;
              prevPositiveReactionsMap.current[key] = post.reactions.mask3;

              const ascensionClass =
                post.spiritScore > 500
                  ? "ascend-tier-5"
                  : post.spiritScore > 200
                  ? "ascend-tier-4"
                  : post.spiritScore > 150
                  ? "ascend-tier-3"
                  : post.spiritScore > 100
                  ? "ascend-tier-2"
                  : "ascend-tier-1";

              const surgeClass =
                surge && post.spiritScore > 200
                  ? "surge-strong"
                  : surge && post.spiritScore > 150
                  ? "surge-medium"
                  : surge && post.spiritScore > 100
                  ? "surge-weak"
                  : "";

              const emotionClass =
                post.positivityRatio > 0.75
                  ? "emotion-boost"
                  : post.positivityRatio > 0.55
                  ? "emotion-intense"
                  : post.positivityRatio < 0.25
                  ? "emotion-soft"
                  : "emotion-calm";

              const floatY = Math.max(-20 - post.spiritScore * 0.25, -90);

              const glyphEmoji =
                post.autoMask === 1 ? "😶‍🌫️" :
                post.autoMask === 2 ? "😤" :
                post.autoMask === 3 ? "😊" :
                post.autoMask === 4 ? "🤩" :
                post.autoMask === 5 ? "😇" :
                post.autoMask === 6 ? "🔱" :
                "😤";

              const intensity = auraIntensity(
                post.spiritScore,
                post.positivityRatio
              );

              const totalReactions =
                post.reactions.mask1 +
                post.reactions.mask2 +
                post.reactions.mask3 +
                post.reactions.mask4 +
                post.reactions.mask5 +
                post.reactions.mask6;

              const trendingScore =
                post.spiritScore + totalReactions * 5;

              const isTrending = trendingScore > 100;

              const isCreator = user?.id === post.creator_id;

              return (
                <div
                  key={post.id}
                  className={`
                    relative
                    p-8
                    rounded-2xl
                    transition-all
                    duration-500
                    overflow-visible
                    w-[420px]
                    flex flex-col

                    plaza-card-base
                    aura-mask-${post.autoMask}
                    aura-intensity-${intensity}

                    ${ascensionClass}
                    ${surgeClass}
                    ${emotionClass}
                  `}
                >
                  <div className="ritual-glyph-container mt-4 flex justify-center">
                    <div className="ritual-glyph-levitate">
                      <div className="ritual-flame-ring clean"></div>
                      <div className="ritual-shadow-floor clean"></div>
                      <div
                        className="emoji-glyph clean"
                        style={{ "--float-y": `${floatY}px` } as CSSProperties}
                      >
                        {glyphEmoji}
                      </div>
                    </div>
                  </div>

                  {isTrending && (
                    <p className="mt-2 text-xs text-yellow-400 text-center">
                      Trending • Score {trendingScore}
                    </p>
                  )}

                  <p className="whitespace-pre-line text-lg leading-relaxed text-gray-100 text-center mt-4 px-4">
                    {post.content}
                  </p>

                  <p className="mt-2 text-sm text-gray-400 text-center">
                    SpiritScore: {post.spiritScore} • Reactions: {totalReactions}
                  </p>

                  {isCreator && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                      className="absolute bottom-3 right-3 px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-500 disabled:opacity-50"
                    >
                      {deletingId === post.id ? "Deleting…" : "Delete"}
                    </button>
                  )}

                  <div className="mt-6 w-full flex justify-center">
                    <ReactionBar
                      postId={post.id}
                      creatorId={post.creator_id}
                      reactions={post.reactions}
                      spiritScore={post.spiritScore}
                      positivityRatio={post.positivityRatio}
                      onReact={() => fetchPosts(0, false)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-8 bg-purple-600 px-4 py-2 rounded hover:bg-purple-500 disabled:opacity-50 text-sm"
            >
              {loadingMore ? "Loading more…" : "Load more"}
            </button>
          )}

          {!hasMore && posts.length > 0 && (
            <p className="mt-4 text-gray-500 text-xs">
              You’ve reached the end of the Plaza.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
