"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import ReactionBar from "@/components/ReactionBar";
import FloatingComposer from "@/components/FloatingComposer";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/supabaseClient";

console.log("Supabase Plaza — D4 Theme Active");

interface CreatorProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  spirit_score: number;
  mask_tier: number;
}

interface PlazaPost {
  id: number;
  creator_id: string;
  content: string;
  created_at: string;
  mask: number | null;
  spirit_score: number | null;
  reactions: any;
}

function maskTitle(mask: number) {
  switch (mask) {
    case 1: return "Dark Whisper";
    case 2: return "Fierce Awakener";
    case 3: return "Gentle Riser";
    case 4: return "Radiant Ascender";
    case 5: return "Seraphic Uplifter";
    case 6: return "Divine Apex";
    default: return "Unknown Mask";
  }
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
  const { user } = useUser();

  const [creators, setCreators] = useState<Record<string, CreatorProfile>>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const prevPositivityMap = useRef<Record<string, number>>({});
  const prevPositiveReactionsMap = useRef<Record<string, number>>({});

  async function fetchCreatorProfile(id: string) {
    if (creators[id]) return creators[id];

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Creator profile fetch error:", error);
      return null;
    }

    setCreators((prev) => ({ ...prev, [id]: data }));
    return data;
  }

  async function fetchPosts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Post fetch error:", error);
      setLoading(false);
      return;
    }

    const patched = await Promise.all(
      data.map(async (p: PlazaPost) => {
        const r = p.reactions || {};

        const total =
          (r["1"] ?? 0) +
          (r["2"] ?? 0) +
          (r["3"] ?? 0) +
          (r["4"] ?? 0) +
          (r["5"] ?? 0) +
          (r["6"] ?? 0);

        const positive =
          (r["3"] ?? 0) +
          (r["4"] ?? 0) +
          (r["5"] ?? 0) +
          (r["6"] ?? 0);

        const positivityRatio = total > 0 ? positive / total : 0.5;

        const score = p.spirit_score ?? 0;

        // ⭐ AutoMask logic (Option C)
        let autoMask = 2;
        if (score <= 20) autoMask = 2;
        else if (score <= 100) autoMask = 3;
        else if (score <= 200) autoMask = 4;
        else if (score <= 500) autoMask = 5;
        else autoMask = 6;

        await fetchCreatorProfile(p.creator_id);

        return {
          ...p,
          autoMask,
          positivityRatio,
          reactions: {
            mask1: r["1"] ?? 0,
            mask2: r["2"] ?? 0,
            mask3: r["3"] ?? 0,
            mask4: r["4"] ?? 0,
            mask5: r["5"] ?? 0,
            mask6: r["6"] ?? 0,
          },
        };
      })
    );

    setPosts(patched);
    setLoading(false);
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="plaza-background min-h-[180vh] w-full pt-28 pb-32 relative z-0">

      {/* HEADER */}
      <div className="w-full flex justify-between items-center px-6 mb-10">
        <Link href="/plaza" className="text-xl font-bold text-purple-300 hover:text-purple-400 transition">
          Mmanwu Plaza
        </Link>

        <Link href="/profile/me" className="text-lg font-semibold text-purple-200 hover:text-purple-300 transition">
          My Profile
        </Link>
      </div>

      {/* TEMPLE EMBERS */}
      <div className="temple-ember" style={{ left: "12%", top: "20%" }}></div>
      <div className="temple-ember" style={{ left: "28%", top: "40%" }}></div>
      <div className="temple-ember" style={{ left: "45%", top: "10%" }}></div>
      <div className="temple-ember" style={{ left: "62%", top: "35%" }}></div>
      <div className="temple-ember" style={{ left: "78%", top: "25%" }}></div>

      <div className="w-full flex flex-col items-center mt-10 px-4">

        {loading && <p className="text-gray-300">Loading posts…</p>}

        <div className="space-y-12 w-full flex flex-col items-center">
          {posts.map((post) => {
            const creator = creators[post.creator_id];

            const score = post.spirit_score ?? 0;
            const positivityRatio = post.positivityRatio;

            const key = String(post.id);

            const prevPos = prevPositivityMap.current[key] ?? positivityRatio;
            const prevPosReacts = prevPositiveReactionsMap.current[key] ?? 0;

            const positivitySpike = positivityRatio - prevPos > 0.25;
            const newPositiveReaction = prevPosReacts < positivityRatio;

            const surge = positivitySpike || newPositiveReaction;

            prevPositivityMap.current[key] = positivityRatio;
            prevPositiveReactionsMap.current[key] = positivityRatio;

            const ascensionClass =
              score > 500
                ? "ascend-tier-5"
                : score > 200
                ? "ascend-tier-4"
                : score > 150
                ? "ascend-tier-3"
                : score > 100
                ? "ascend-tier-2"
                : "ascend-tier-1";

            const surgeClass =
              surge && score > 200
                ? "surge-strong"
                : surge && score > 150
                ? "surge-medium"
                : surge && score > 100
                ? "surge-weak"
                : "";

            const emotionClass =
              positivityRatio > 0.75
                ? "emotion-boost"
                : positivityRatio > 0.55
                ? "emotion-intense"
                : positivityRatio < 0.25
                ? "emotion-soft"
                : "emotion-calm";

            const glyphEmoji =
              post.autoMask === 1 ? "😶‍🌫️" :
              post.autoMask === 2 ? "😤" :
              post.autoMask === 3 ? "😊" :
              post.autoMask === 4 ? "🤩" :
              post.autoMask === 5 ? "😇" :
              post.autoMask === 6 ? "🔱" :
              "😤";

            const intensity = auraIntensity(score, positivityRatio);

            return (
              <div
                key={post.id}
                className={`
                  relative p-8 rounded-2xl transition-all duration-500
                  overflow-visible min-h-[420px] w-[380px] mx-auto flex flex-col items-center
                  plaza-card-base aura-mask-${post.autoMask} aura-intensity-${intensity}
                  ${ascensionClass} ${surgeClass} ${emotionClass}
                `}
              >
                {/* GLYPH */}
                <div className="ritual-glyph-container mt-6">
                  <div className="ritual-glyph-levitate">
                    <div className="ritual-flame-ring"></div>
                    <div className="ritual-shadow-floor"></div>
                    <div className="emoji-glyph" style={{ "--float-y": "-40px" } as CSSProperties}>
                      {glyphEmoji}
                    </div>
                  </div>
                </div>

                {/* CREATOR */}
                <div className="mt-4 flex flex-col items-center text-gray-300">
                  <img
                    src={creator?.avatar_url || "/default-avatar.png"}
                    className="w-12 h-12 rounded-full border border-white/20 object-cover mb-2"
                  />
                  <span className="font-semibold text-gray-200">
                    {creator?.username || "Unknown User"}
                  </span>
                  <span className="text-xs text-gray-400">
                    Mask Tier: {creator?.mask_tier ?? "?"}
                  </span>
                  <span className="text-xs text-gray-400">
                    Spirit Score: {score}
                  </span>
                </div>

                {/* MASK TITLE */}
                <div className="mt-4 text-center">
                  <div className="text-sm font-semibold tracking-wide ritual-mask-title">
                    {maskTitle(post.autoMask)}
                  </div>
                </div>

                {/* CONTENT */}
                <p className="whitespace-pre-line text-lg leading-relaxed text-gray-100 text-center mt-3 px-4">
                  {post.content}
                </p>

                {/* FOOTER */}
                <div className="mt-4 flex justify-between w-full text-sm text-gray-400">
                  <span>Mask: {post.autoMask}</span>
                  <span>{new Date(post.created_at).toLocaleString()}</span>
                </div>

                {/* PROFILE LINK */}
                <Link
                  href={`/profile/${post.creator_id}`}
                  className="text-xs text-blue-300 hover:text-blue-200 hover:underline mt-2"
                >
                  View Profile →
                </Link>

                {/* REACTION BAR */}
                <div className="mt-6 w-full flex justify-center">
                  <ReactionBar
                    postId={post.id}   // ⭐ FIXED — number, not string
                    creatorId={post.creator_id}
                    reactions={post.reactions}
                    spiritScore={score}
                    positivityRatio={positivityRatio}
                    onReact={fetchPosts}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <FloatingComposer onPost={fetchPosts} />
      </div>
    </div>
  );
}
