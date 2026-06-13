"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef } from "react";
import ReactionBar from "@/components/ReactionBar";
import FloatingComposer from "@/components/FloatingComposer";
import { useUser } from "@/context/UserContext";   // ⭐ ADDED

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
// Main Plaza Page
// -----------------------------
export default function PlazaPage() {
  const { user, loading: userLoading } = useUser();   // ⭐ ADDED

  const [creators, setCreators] = useState<Record<string, CreatorProfile>>({});

  const [posts, setPosts] = useState<PlazaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [debugAscension, setDebugAscension] = useState(false);

  const prevPositivityMap = useRef<Record<string, number>>({});
  const prevPositiveReactionsMap = useRef<Record<string, number>>({});

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "d") {
        setDebugAscension((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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

      // ⭐ AutoMask evolution (unchanged)
      let autoMask = 2;
      if (spiritScore >= 0 && spiritScore <= 20) autoMask = 2;
      else if (spiritScore >= 21 && spiritScore <= 100) autoMask = 3;
      else if (spiritScore >= 101 && spiritScore <= 200) autoMask = 4;
      else if (spiritScore >= 201 && spiritScore <= 500) autoMask = 5;
      else if (spiritScore > 500) autoMask = 6;

      // ⭐ NEW: Trigger creator profile fetch (cached)
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

  useEffect(() => {
    fetchPosts();
  }, []);

  function auraColor(mask: number) {
    switch (mask) {
      case 1: return "#7C3AED";
      case 2: return "#DC2626";
      case 3: return "#22C55E";
      case 4: return "#FACC15";
      case 5: return "#3B82F6";
      case 6: return "#F97316";
      default: return "#22C55E";
    }
  }

  function auraStyle(score = 0, mask: number, positivityRatio: number) {
    const color = auraColor(mask);

    let intensityLevel =
      score < 6 ? 0 :
      score < 16 ? 1 :
      score < 31 ? 2 : 3;

    const boost = positivityRatio > 0.6 ? 1 : 0;
    const dampen = positivityRatio < 0.3 ? -1 : 0;

    const finalLevel = Math.max(0, Math.min(3, intensityLevel + boost + dampen));

    if (finalLevel === 0) return { borderColor: color };
    if (finalLevel === 1) return {
      borderColor: color,
      animation: "aura-breathe 3s ease-in-out infinite",
    };
    if (finalLevel === 2) return {
      borderColor: color,
      animation: "aura-breathe 2.4s ease-in-out infinite",
    };
    return {
      borderColor: color,
      animation: "aura-pulse 2s ease-in-out infinite",
    };
  }

  return (
    <>
      {/* styles omitted for brevity — unchanged */}

      <div className="w-full flex flex-col items-center mt-10 px-4 bg-white">
        <h1 className="text-2xl font-bold text-black mb-6 text-center">
          Mmanwu Plaza
        </h1>

        {loading && <p className="text-gray-600">Loading posts…</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && posts.length === 0 && (
          <p className="text-gray-600">No posts yet…</p>
        )}

        <div className="w-full flex flex-col items-center">
          <div className="space-y-12 w-full flex flex-col items-center">
            {posts.map((post) => {
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

              let baseStage =
                score < 6 ? 1 :
                score < 16 ? 2 :
                score < 31 ? 3 :
                score < 51 ? 4 : 5;

              const stageBoost = positivityRatio > 0.7 ? 1 : 0;
              const stageDampen = positivityRatio < 0.3 ? -1 : 0;

              let stage = Math.max(1, Math.min(5, baseStage + stageBoost + stageDampen));

              if (debugAscension) {
                stage = (post.id % 5) + 1;
              }

              const key = String(post.id);

              const prevPos = prevPositivityMap.current[key] ?? positivityRatio;
              const prevPosReacts = prevPositiveReactionsMap.current[key] ?? positive;

              const positivitySpike = positivityRatio - prevPos > 0.25;
              const newPositiveReaction = positive > prevPosReacts;

              const surge = positivitySpike || newPositiveReaction;

              prevPositivityMap.current[key] = positivityRatio;
              prevPositiveReactionsMap.current[key] = positive;

              const ascensionClass =
                score > 200
                  ? "ascend-tier-4"
                  : score > 150
                  ? "ascend-tier-3"
                  : score > 100
                  ? "ascend-tier-2"
                  : "ascend-tier-1";

              const surgeClass =
                score > 200
                  ? "surge-strong"
                  : score > 150
                  ? "surge-medium"
                  : "surge-weak";

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

              return (
                <div
                  key={post.id}
                  className={`
                    relative
                    p-8
                    rounded-2xl
                    bg-white
                    transition-all
                    duration-500
                    border
                    overflow-visible
                    isolate-layout
                    min-h-[420px]
                    shadow-[0_10px_30px_rgba(0,0,0,0.05)]
                    max-w-[300px]
                    mx-auto
                    plaza-card-base
                    ${ascensionClass}
                    ${surgeClass}
                    ${emotionClass}
                  `}
                  style={
                    {
                      "--aura-color": auraColor(post.autoMask),
                      ...auraStyle(score, post.autoMask, positivityRatio),
                    } as unknown as React.CSSProperties
                  }
                >
                  {/* ... all your animations and visuals unchanged ... */}

                  <ReactionBar
                    postId={String(post.id)}
                    creatorId={post.creatorId}
                    reactions={{
                      mask1: post.reactions?.mask1 ?? 0,
                      mask2: post.reactions?.mask2 ?? 0,
                      mask3: post.reactions?.mask3 ?? 0,
                      mask4: post.reactions?.mask4 ?? 0,
                      mask5: post.reactions?.mask5 ?? 0,
                    }}
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
                      if (newScore >= 0 && newScore <= 20) newAutoMask = 2;
                      else if (newScore >= 21 && newScore <= 100) newAutoMask = 3;
                      else if (newScore >= 101 && newScore <= 200) newAutoMask = 4;
                      else if (newScore >= 201 && newScore <= 500) newAutoMask = 5;
                      else if (newScore > 500) newAutoMask = 6;

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
              );
            })}
          </div>
        </div>

        <FloatingComposer onPost={fetchPosts} />
      </div>
    </>
  );
}
