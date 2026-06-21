"use client";

import React, { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

import Sidebar from "@/components/plaza/Sidebar";
import ReactionBar from "@/components/plaza/ReactionBar";
import FloatingComposer from "@/components/plaza/FloatingComposer";

interface PlazaPost {
  id: string;                // UUID FIX
  creator_id: string;
  content: string;
  created_at: string;
  mask: number;
  spirit_score: number;      // ✅ DB column
}

interface ReactionRow {
  post_id: string;           // UUID FIX
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
  spiritScore: number;       // ✅ UI field, derived from spirit_score
  positivityRatio: number;
  autoMask: number;
}

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

  const [posts, setPosts] = useState<PlazaPostWithAggregates[]>([]);
  const [loading, setLoading] = useState(true);

  const prevPositivityMap = useRef<Record<string, number>>({});
  const prevPositiveReactionsMap = useRef<Record<string, number>>({});

  async function fetchPosts() {
    setLoading(true);

    // 1) Fetch posts (includes spirit_score from DB)
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (postsError || !postsData) {
      console.error("Error fetching posts:", postsError);
      setPosts([]);
      setLoading(false);
      return;
    }

    const postIds = postsData.map((p) => p.id as string);

    if (postIds.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // 2) Fetch reactions for these posts
    const { data: reactionsData, error: reactionsError } = await supabase
      .from("reactions")
      .select("post_id, maskTier, value")
      .in("post_id", postIds);

    if (reactionsError) {
      console.error("Error fetching reactions:", reactionsError);
    }

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

      // ✅ Use SpiritScore from DB (updated by trigger), not recomputed from value
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
        ...post,
        reactions: counts,
        spiritScore,
        positivityRatio,
        autoMask,
      };
    });

    setPosts(merged);
    setLoading(false);
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen w-full bg-black text-gray-100">
      <Sidebar />

      <div className="absolute left-0 top-20 w-[180px] px-4 z-[5000]">
        <FloatingComposer onPost={fetchPosts} />
      </div>

      <div className="flex">
        <div className="w-[180px] shrink-0" />

        <div className="flex-1 flex flex-col items-center pt-36 pb-40 px-4">
          <div className="w-full flex flex-col items-center mb-10">
            <h1 className="text-3xl font-bold text-purple-200 tracking-wide clean-plaza-header">
              Mmanwu Plaza (TEST)
            </h1>
            <div className="h-[1px] w-40 bg-purple-500/20 mt-3"></div>
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
                    w-[360px]
                    h-[420px]
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

                  <p className="whitespace-pre-line text-lg leading-relaxed text-gray-100 text-center mt-4 px-4">
                    {post.content}
                  </p>

                  <p className="mt-2 text-sm text-gray-400 text-center">
                    SpiritScore: {post.spiritScore}
                  </p>

                  <div className="mt-auto w-full">
                    <div className="mt-4 flex justify-between w-full text-sm text-gray-400">
                      <span>Mask: {post.autoMask}</span>
                      <span>{new Date(post.created_at).toLocaleString()}</span>
                    </div>

                    <div className="mt-4 w-full flex justify-center">
                      <ReactionBar
                        postId={post.id}              // UUID FIX
                        creatorId={post.creator_id}
                        reactions={post.reactions}
                        spiritScore={post.spiritScore}
                        positivityRatio={post.positivityRatio}
                        onReact={fetchPosts}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
