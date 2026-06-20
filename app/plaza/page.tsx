"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import ReactionBar from "@/components/plaza/ReactionBar";
import FloatingComposer from "@/components/plaza/FloatingComposer";

interface PlazaPost {
  id: number;
  creator_id: string;
  content: string;
  created_at: string;
  mask: number;
}

interface ReactionAggregates {
  post_id: number;
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
  spirit_score: number;
  positivity_ratio: number;
}

interface PlazaPostWithAggregates extends PlazaPost {
  reactions: ReactionAggregates;
  spiritScore: number;
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

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: aggData } = await supabase
      .from("reaction_aggregates_mv")
      .select("*");

    const merged: PlazaPostWithAggregates[] = postsData!.map((post) => {
      const agg = aggData!.find((a) => a.post_id === post.id);

      const reactions = {
        mask1: agg?.mask1 ?? 0,
        mask2: agg?.mask2 ?? 0,
        mask3: agg?.mask3 ?? 0,
        mask4: agg?.mask4 ?? 0,
        mask5: agg?.mask5 ?? 0,
        mask6: agg?.mask6 ?? 0,
      };

      const total =
        reactions.mask1 +
        reactions.mask2 +
        reactions.mask3 +
        reactions.mask4 +
        reactions.mask5 +
        reactions.mask6;

      const positive =
        reactions.mask3 +
        reactions.mask4 +
        reactions.mask5 +
        reactions.mask6;

      const positivityRatio =
        total > 0 ? positive / total : agg?.positivity_ratio ?? 0.5;

      const spiritScore = agg?.spirit_score ?? 0;

      let autoMask = 2;
      if (spiritScore <= 20) autoMask = 2;
      else if (spiritScore <= 100) autoMask = 3;
      else if (spiritScore <= 200) autoMask = 4;
      else if (spiritScore <= 500) autoMask = 5;
      else autoMask = 6;

      return {
        ...post,
        reactions,
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
    <div className="plaza-background min-h-screen w-full pt-24 pb-40 relative">

      {/* CLEAN D4 HEADER WITH LINKS */}
<div className="w-full flex justify-between items-center mb-10 px-6">

  {/* LEFT — My Profile */}
  <Link
    href="/profile"
    className="text-sm font-semibold text-purple-200 hover:text-white transition-all clean-plaza-header"
  >
    My Profile
  </Link>

  {/* CENTER — Plaza Title */}
  <h1 className="text-3xl font-bold text-purple-200 tracking-wide clean-plaza-header">
    Mmanwu Plaza
  </h1>

  {/* RIGHT — Logout + Home */}
  <div className="flex items-center gap-4">
    <Link
      href="/logout"
      className="text-sm font-semibold text-purple-200 hover:text-white transition-all clean-plaza-header"
    >
      Logout
    </Link>

    <Link
      href="/"
      className="text-sm font-semibold text-purple-200 hover:text-white transition-all clean-plaza-header"
    >
      Home
    </Link>
  </div>

</div>

      {/* SUBTLE EMBERS */}
      <div className="temple-ember subtle" style={{ left: "18%", top: "22%" }}></div>
      <div className="temple-ember subtle" style={{ left: "42%", top: "12%" }}></div>
      <div className="temple-ember subtle" style={{ left: "63%", top: "38%" }}></div>
      <div className="temple-ember subtle" style={{ left: "78%", top: "18%" }}></div>

      {/* CENTER COLUMN */}
      <div className="w-full flex flex-col items-center px-4 space-y-12">

        {loading && <p className="text-gray-300">Loading posts…</p>}
        {!loading && posts.length === 0 && (
          <p className="text-gray-300">No posts yet…</p>
        )}

        {posts.map((post) => {
          const key = String(post.id);

          const prevPos = prevPositivityMap.current[key] ?? post.positivityRatio;
          const prevPosReacts = prevPositiveReactionsMap.current[key] ?? post.reactions.mask3;

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

          const intensity = auraIntensity(post.spiritScore, post.positivityRatio);

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
                min-h-[360px]
                flex flex-col

                plaza-card-base
                aura-mask-${post.autoMask}
                aura-intensity-${intensity}

                ${ascensionClass}
                ${surgeClass}
                ${emotionClass}
              `}
            >

              {/* GLYPH */}
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

              {/* CONTENT */}
              <p className="whitespace-pre-line text-lg leading-relaxed text-gray-100 text-center mt-4 px-4">
                {post.content}
              </p>

              {/* SPIRIT SCORE */}
              <p className="mt-2 text-sm text-gray-400 text-center">
                Spirit: {post.spiritScore}
              </p>

              {/* FOOTER + REACTION BAR AT BOTTOM */}
              <div className="mt-auto w-full">

                <div className="mt-4 flex justify-between w-full text-sm text-gray-400">
                  <span>Mask: {post.autoMask}</span>
                  <span>{new Date(post.created_at).toLocaleString()}</span>
                </div>

                <div className="mt-4 w-full flex justify-center">
                  <ReactionBar
                    postId={post.id}
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

      {/* FLOATING COMPOSER — RAISED FOR VISIBILITY */}
      <div className="fixed bottom-20 left-0 w-full flex justify-center pointer-events-none">
  <div className="pointer-events-auto">
    <FloatingComposer onPost={fetchPosts} />
  </div>
</div>

    </div>
  );
}
