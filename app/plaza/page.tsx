// plaza-phase1-hybrid-FINAL
"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef } from "react";
import ReactionBar from "@/components/ReactionBar";

interface PlazaPost {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  maskTier: number;
  spiritScore?: number;
  positivityRatio?: number;
  reactions?: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
  };
}

export default function PlazaPage() {
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
      const res = await fetch(
        "https://mmanwu-clean-production-6465.up.railway.app/plaza",
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch posts");

      const data: PlazaPost[] = await res.json();

      const patched = data.map((p) => ({
        ...p,
        spiritScore: p.spiritScore ?? 0,
        positivityRatio: p.positivityRatio ?? 0.5,
        reactions: p.reactions ?? {
          mask1: 0,
          mask2: 0,
          mask3: 0,
          mask4: 0,
          mask5: 0,
        },
      }));

      const sorted = patched.sort(
        (a, b) =>
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

  // OLD PALETTE — JS AURA ENGINE
  function auraColor(mask: number) {
    switch (mask) {
      case 1: return "#7C3AED"; // violet
      case 2: return "#DC2626"; // red
      case 3: return "#22C55E"; // green
      case 4: return "#FACC15"; // gold
      case 5: return "#3B82F6"; // blue
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
    <div className="max-w-xl mx-auto mt-10 px-4">
      <h1 className="text-2xl font-bold text-white mb-6 text-center">
        Mmanwu Plaza
      </h1>

      {loading && <p className="text-gray-400">Loading posts…</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && posts.length === 0 && (
        <p className="text-gray-400">No posts yet…</p>
      )}

      <div className="space-y-6">
        {posts.map((post) => {
          const score = post.spiritScore ?? 0;

          const total =
            (post.reactions?.mask1 ?? 0) +
            (post.reactions?.mask2 ?? 0) +
            (post.reactions?.mask3 ?? 0) +
            (post.reactions?.mask4 ?? 0) +
            (post.reactions?.mask5 ?? 0);

          const positive =
            (post.reactions?.mask3 ?? 0) +
            (post.reactions?.mask4 ?? 0) +
            (post.reactions?.mask5 ?? 0);

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
            const numericId = parseInt(post.id, 10);
            stage = isNaN(numericId) ? stage : (numericId % 5) + 1;
          }

          const prevPos = prevPositivityMap.current[post.id] ?? positivityRatio;
          const prevPosReacts = prevPositiveReactionsMap.current[post.id] ?? positive;

          const positivitySpike = positivityRatio - prevPos > 0.25;
          const newPositiveReaction = positive > prevPosReacts;

          const surge = positivitySpike || newPositiveReaction;

          prevPositivityMap.current[post.id] = positivityRatio;
          prevPositiveReactionsMap.current[post.id] = positive;

          const auraClass = "mask-aura";

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

          return (
            <div
              key={post.id}
              className={`
                relative
                p-8
                rounded-2xl
                bg-[#111]
                transition-all
                duration-500
                border
                overflow-visible
                isolate-layout
                min-h-[420px]
                mb-10
                shadow-[0_10px_30px_rgba(0,0,0,0.05)]
                max-w-[300px]
                mx-auto

                plaza-card-base

                mask-tier-${post.maskTier}
                ${auraClass}
                ${ascensionClass}
                ${surgeClass}
                ${emotionClass}
              `}
              style={
                {
                  "--aura-color": auraColor(post.maskTier),
                  ...auraStyle(score, post.maskTier, positivityRatio),
                } as unknown as React.CSSProperties
              }
            >
              <div
                className="absolute left-0 top-0 h-full w-[6px] rounded-l-2xl"
                style={{ background: auraColor(post.maskTier) }}
              ></div>

              <div
                className="absolute -top-5 left-1/2 -translate-x-1/2 text-4xl drop-shadow-sm"
                style={{ color: auraColor(post.maskTier) }}
              >
                {post.maskTier === 1 && "🜂"}
                {post.maskTier === 2 && "🔥"}
                {post.maskTier === 3 && "🜁"}
                {post.maskTier === 4 && "✨"}
                {post.maskTier === 5 && "🌿"}
              </div>

              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 40px ${auraColor(post.maskTier)}15`,
                }}
              ></div>

              {surge && (
                <div className="surge-flash absolute inset-0 rounded-2xl"></div>
              )}
              {surge && <div className="surge-ripple"></div>}

              {debugAscension && (
                <div className="absolute top-1 right-2 text-xs text-red-500 font-bold">
                  DEBUG S{stage}
                </div>
              )}

              {stage >= 4 && <div className="ascension-ring" />}
              {stage >= 5 && <div className="ascension-halo" />}

              {stage >= 4 && positivityRatio > 0.4 && (
                <>
                  <div
                    className="spirit-spark"
                    style={{
                      top: "20%",
                      left: "40%",
                      background: auraColor(post.maskTier),
                    }}
                  />
                  {positivityRatio > 0.6 && (
                    <div
                      className="spirit-spark"
                      style={{
                        top: "60%",
                        left: "55%",
                        animationDelay: "0.2s",
                        background: auraColor(post.maskTier),
                      }}
                    />
                  )}
                  {positivityRatio > 0.8 && (
                    <div
                      className="spirit-spark"
                      style={{
                        top: "35%",
                        left: "70%",
                        animationDelay: "0.4s",
                        background: auraColor(post.maskTier),
                      }}
                    />
                  )}
                </>
              )}

              {score >= 16 && (
                <>
                  <div
                    className="spirit-particle"
                    style={{
                      top: "10%",
                      left: "5%",
                      background: auraColor(post.maskTier),
                    }}
                  />
                  <div
                    className="spirit-particle"
                    style={{
                      top: "50%",
                      left: "90%",
                      animationDelay: "1s",
                      background: auraColor(post.maskTier),
                    }}
                  />
                  <div
                    className="spirit-particle"
                    style={{
                      top: "80%",
                      left: "20%",
                      animationDelay: "2s",
                      background: auraColor(post.maskTier),
                    }}
                  />
                </>
              )}

              <div
                className="text-xs font-semibold mb-2 tracking-wide"
                style={{ color: auraColor(post.maskTier) }}
              >
                Spirit Score: {score}
              </div>

              <p className="whitespace-pre-line text-lg leading-relaxed text-gray-200">
                {post.content}
              </p>

              <div className="mt-6 flex justify-between text-sm text-gray-500">
                <span>Mask: {post.maskTier}</span>
                <span>{new Date(post.createdAt).toLocaleString()}</span>
              </div>

              <ReactionBar
                postId={post.id}
                userId={post.userId ?? "demo-user-123"}
                reactions={{
                  mask1: post.reactions?.mask1 ?? 0,
                  mask2: post.reactions?.mask2 ?? 0,
                  mask3: post.reactions?.mask3 ?? 0,
                  mask4: post.reactions?.mask4 ?? 0,
                  mask5: post.reactions?.mask5 ?? 0,
                }}
                spiritScore={score}
                positivityRatio={positivityRatio}
                onReact={() => fetchPosts()}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
