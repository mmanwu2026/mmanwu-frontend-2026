"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import ReactionBar from "@/components/ReactionBar";
import FloatingComposer from "@/components/FloatingComposer";
import { useUser } from "@/context/UserContext";

console.log("force aura rebuild 4");

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

// -----------------------------
// Types
// -----------------------------
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
  creatorId: string;
  content: string;
  createdAt: string;
  maskTier: number;
  autoMask: number;
  spiritScore: number;
  positivityRatio: number;
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
    mask6?: number;
  };
}

// -----------------------------
// Helpers
// -----------------------------
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

// -----------------------------
// Main Plaza Page
// -----------------------------
export default function PlazaPage() {
  const { user } = useUser();

  const [creators, setCreators] = useState<Record<string, CreatorProfile>>({});
  const [posts, setPosts] = useState<PlazaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const prevPositivityMap = useRef<Record<string, number>>({});
  const prevPositiveReactionsMap = useRef<Record<string, number>>({});

  async function fetchPosts() {
    try {
      const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/plaza`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to fetch posts");

      const data = await res.json();

      const patched: PlazaPost[] = data.map((p: any) => {
        const r = p.reactions || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

        const total =
          (r[1] || 0) +
          (r[2] || 0) +
          (r[3] || 0) +
          (r[4] || 0) +
          (r[5] || 0) +
          (r[6] || 0);

        const positive =
          (r[3] || 0) +
          (r[4] || 0) +
          (r[5] || 0) +
          (r[6] || 0);

        const positivityRatio = total > 0 ? positive / total : 0.5;

        const spiritScore = p.spiritScore ?? 0;

        let autoMask = 2;
        if (spiritScore <= 20) autoMask = 2;
        else if (spiritScore <= 100) autoMask = 3;
        else if (spiritScore <= 200) autoMask = 4;
        else if (spiritScore <= 500) autoMask = 5;
        else autoMask = 6;

        fetchCreatorProfile(p.creatorId);

        return {
          id: p.id,
          creatorId: p.creatorId ?? "unknown-creator",
          content: p.content,
          createdAt: p.createdAt,
          maskTier: p.mask,
          autoMask,
          spiritScore,
          positivityRatio,
          reactions: {
            mask1: r[1] || 0,
            mask2: r[2] || 0,
            mask3: r[3] || 0,
            mask4: r[4] || 0,
            mask5: r[5] || 0,
            mask6: r[6] || 0,
          },
        };
      });

      const sorted = patched.sort(
        (a: PlazaPost, b: PlazaPost) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      setPosts(sorted);
    } catch (err) {
      setError("Unable to load posts.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCreatorProfile(id: string) {
    if (creators[id]) return creators[id];

    try {
      const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/users/${id}`);
      if (!res.ok) throw new Error("Failed to fetch creator profile");

      const data = await res.json();
      const profile = data.user;

      setCreators((prev) => ({ ...prev, [id]: profile }));

      return profile;
    } catch (err) {
      console.error("Creator profile fetch error:", err);
      return null;
    }
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="plaza-background min-h-[180vh] w-full pt-28 pb-32 relative z-0">

      {/* HEADER — FIXED */}
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
      <div className="temple-ember" style={{ left: "15%", top: "60%" }}></div>
      <div className="temple-ember" style={{ left: "50%", top: "70%" }}></div>
      <div className="temple-ember" style={{ left: "85%", top: "55%" }}></div>

      <div className="w-full flex flex-col items-center mt-10 px-4">

        {loading && <p className="text-gray-300">Loading posts…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && posts.length === 0 && (
          <p className="text-gray-300">No posts yet…</p>
        )}

        <div className="w-full flex flex-col items-center">
          <div className="space-y-12 w-full flex flex-col items-center">

            {posts.map((post) => {
              const creator = creators[post.creatorId];

              const score = post.spiritScore ?? 0;

              const total =
                (post.reactions?.mask1 ?? 0) +
                (post.reactions?.mask2 ?? 0) +
                (post.reactions?.mask3 ?? 0) +
                (post.reactions?.mask4 ?? 0) +
                (post.reactions?.mask5 ?? 0) +
                (post.reactions?.mask6 ?? 0);

              const positive =
                (post.reactions?.mask3 ?? 0) +
                (post.reactions?.mask4 ?? 0) +
                (post.reactions?.mask5 ?? 0) +
                (post.reactions?.mask6 ?? 0);

              const positivityRatio =
                total > 0 ? positive / total : post.positivityRatio ?? 0.5;

              const key = String(post.id);

              const prevPos = prevPositivityMap.current[key] ?? positivityRatio;
              const prevPosReacts = prevPositiveReactionsMap.current[key] ?? positive;

              const positivitySpike = positivityRatio - prevPos > 0.25;
              const newPositiveReaction = positive > prevPosReacts;

              const surge = positivitySpike || newPositiveReaction;

              prevPositivityMap.current[key] = positivityRatio;
              prevPositiveReactionsMap.current[key] = positive;

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

              let emojiAnimClass = "";
              switch (post.autoMask) {
                case 1: emojiAnimClass = "emoji-pulse"; break;
                case 2: emojiAnimClass = "emoji-bounce"; break;
                case 3: emojiAnimClass = "emoji-wiggle"; break;
                case 4: emojiAnimClass = "emoji-pop"; break;
                case 5: emojiAnimClass = "emoji-shimmer"; break;
                case 6: emojiAnimClass = "emoji-shimmer"; break;
                default: emojiAnimClass = "emoji-pulse";
              }

              const emojiReactClass = surge ? "emoji-react-pop" : "";

              const floatY = Math.max(-20 - score * 0.25, -90);

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
                    relative
                    p-8
                    rounded-2xl
                    transition-all
                    duration-500
                    overflow-visible
                    min-h-[420px]
                    w-[380px]
                    mx-auto
                    flex flex-col items-center

                    plaza-card-base
                    aura-mask-${post.autoMask}
                    aura-intensity-${intensity}

                    ${ascensionClass}
                    ${surgeClass}
                    ${emotionClass}
                  `}
                >

                  {/* GLYPH + FLAME RING */}
                  <div className="ritual-glyph-container mt-6">
                    <div className="ritual-glyph-levitate">
                      <div className="ritual-flame-ring"></div>
                      <div className="ritual-shadow-floor"></div>
                      <div
                        className={`emoji-glyph ${emojiAnimClass} ${emojiReactClass}`}
                        style={{ "--float-y": `${floatY}px` } as CSSProperties}
                      >
                        {glyphEmoji}
                      </div>
                    </div>
                  </div>

                  {/* CREATOR BADGE */}
                  <div className="mt-4 flex flex-col items-center text-gray-300">
                    <img
                      src={creator?.avatar_url || "/default-avatar.png"}
                      alt="avatar"
                      className="w-12 h-12 rounded-full border border-white/20 object-cover mb-2"
                    />
                    <span className="font-semibold text-gray-200">
                      {creator?.username || "Unknown User"}
                    </span>
                    <span className="text-xs text-gray-400">
                      Mask Tier: {creator?.mask_tier ?? "?"}
                    </span>
                    <span className="text-xs text-gray-400">
                      Spirit Score: {post.spiritScore ?? 0}
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
                    <span>{new Date(post.createdAt).toLocaleString()}</span>
                  </div>

                  {/* VIEW PROFILE */}
                  <Link
                    href={`/profile/${post.creatorId}`}
                    className="text-xs text-blue-300 hover:text-blue-200 hover:underline mt-2"
                  >
                    View Profile →
                  </Link>

                  {/* REACTION BAR */}
                  <div className="mt-6 w-full flex justify-center">
                    <ReactionBar
                      postId={String(post.id)}
                      creatorId={post.creatorId}
                      reactions={post.reactions}
                      spiritScore={score}
                      positivityRatio={positivityRatio}
                      onReact={(updatedPost) => {
                        const r = updatedPost.reactions || {};

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

                        const newPositivityRatio =
                          total > 0 ? positive / total : 0.5;

                        const newScore = updatedPost.spiritScore ?? score;

                        let newAutoMask = 2;
                        if (newScore <= 20) newAutoMask = 2;
                        else if (newScore <= 100) newAutoMask = 3;
                        else if (newScore <= 200) newAutoMask = 4;
                        else if (newScore <= 500) newAutoMask = 5;
                        else newAutoMask = 6;

                        setPosts((prev) =>
                          prev.map((p) =>
                            p.id === updatedPost.id
                              ? {
                                  ...p,
                                  maskTier: updatedPost.mask ?? p.maskTier,
                                  autoMask: newAutoMask,
                                  spiritScore: newScore,
                                  positivityRatio: newPositivityRatio,
                                  reactions: {
                                    mask1: r["1"] ?? 0,
                                    mask2: r["2"] ?? 0,
                                    mask3: r["3"] ?? 0,
                                    mask4: r["4"] ?? 0,
                                    mask5: r["5"] ?? 0,
                                  },
                                }
                              : p
                          )
                        );
                      }}
                    />
                  </div>

                </div>
              );
            })}

          </div>
        </div>

        <FloatingComposer onPost={fetchPosts} />
      </div>
    </div>
  );
}
