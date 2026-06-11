"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef } from "react";
import ReactionBar from "@/components/ReactionBar";
import FloatingComposer from "@/components/FloatingComposer";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

// -----------------------------
// Types
// -----------------------------
interface PlazaPost {
  id: number;
  creatorId: string;   // 🔧 was userId
  content: string;
  createdAt: string;
  maskTier: number;
  spiritScore: number;
  positivityRatio: number;
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
  };
}

// -----------------------------
// Main Plaza Page
// -----------------------------
export default function PlazaPage() {
  const [posts, setPosts] = useState<PlazaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [debugAscension, setDebugAscension] = useState(false);

  const prevPositivityMap = useRef<Record<string, number>>({});
  const prevPositiveReactionsMap = useRef<Record<string, number>>({});

  // Toggle debug ascension with "D"
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "d") {
        setDebugAscension((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Fetch posts
  async function fetchPosts() {
    try {
      const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/plaza`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to fetch posts");

      const data = await res.json();

      const patched: PlazaPost[] = data.map((p: any) => {
        const r = p.reactions || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        const total =
          (r[1] || 0) +
          (r[2] || 0) +
          (r[3] || 0) +
          (r[4] || 0) +
          (r[5] || 0);

        const positive =
          (r[3] || 0) +
          (r[4] || 0) +
          (r[5] || 0);

        const positivityRatio = total > 0 ? positive / total : 0.5;

        return {
          id: p.id,
          creatorId: p.creatorId ?? "unknown-creator", // 🔧 was userId
          content: p.content,
          createdAt: p.createdAt,
          maskTier: p.mask,
          spiritScore: p.spiritScore ?? 0,
          positivityRatio,
          reactions: {
            mask1: r[1] || 0,
            mask2: r[2] || 0,
            mask3: r[3] || 0,
            mask4: r[4] || 0,
            mask5: r[5] || 0,
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

  // Aura color mapping
  function auraColor(mask: number) {
    switch (mask) {
      case 1: return "#7C3AED";
      case 2: return "#DC2626";
      case 3: return "#22C55E";
      case 4: return "#FACC15";
      case 5: return "#3B82F6";
      default: return "#22C55E";
    }
  }

  // Aura style logic
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
      {/* Emoji animation CSS */}
      <style>{`
        .emoji-glyph {
          position: absolute;
          top: -1.25rem;
          left: 50%;
          transform: translateX(-50%);
          font-size: 2.5rem;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
        }
        @keyframes emoji-pulse { 0%{transform:translateX(-50%)scale(1);}50%{transform:translateX(-50%)scale(1.08);}100%{transform:translateX(-50%)scale(1);} }
        @keyframes emoji-bounce { 0%{transform:translateX(-50%)translateY(0);}30%{transform:translateX(-50%)translateY(-6px);}60%{transform:translateX(-50%)translateY(2px);}100%{transform:translateX(-50%)translateY(0);} }
        @keyframes emoji-wiggle { 0%{transform:translateX(-50%)rotate(0);}25%{transform:translateX(-50%)rotate(-4deg);}50%{transform:translateX(-50%)rotate(4deg);}75%{transform:translateX(-50%)rotate(-2deg);}100%{transform:translateX(-50%)rotate(0);} }
        @keyframes emoji-pop { 0%{transform:translateX(-50%)scale(1);}40%{transform:translateX(-50%)scale(1.12);}100%{transform:translateX(-50%)scale(1);} }
        @keyframes emoji-shimmer { 0%{filter:drop-shadow(0 0 0 rgba(255,255,255,0));}50%{filter:drop-shadow(0 0 6px rgba(255,255,255,0.55));}100%{filter:drop-shadow(0 0 0 rgba(255,255,255,0));} }
        .emoji-pulse{animation:emoji-pulse 3s ease-in-out infinite;}
        .emoji-bounce{animation:emoji-bounce 2.4s ease-in-out infinite;}
        .emoji-wiggle{animation:emoji-wiggle 3s ease-in-out infinite;}
        .emoji-pop{animation:emoji-pop 2.2s ease-in-out infinite;}
        .emoji-shimmer{animation:emoji-shimmer 3.2s ease-in-out infinite;}
        .emoji-react-pop{animation:emoji-pop 0.45s ease-out;}
      `}</style>

      {/* WHITE PLAZA BACKGROUND */}
      <div className="w-full flex flex-col items-center mt-10 px-4 bg-white">
        <h1 className="text-2xl font-bold text-black mb-6 text-center">
          Mmanwu Plaza
        </h1>

        {loading && <p className="text-gray-600">Loading posts…</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && posts.length === 0 && (
          <p className="text-gray-600">No posts yet…</p>
        )}

        {/* FIXED SPACING */}
        <div className="w-full flex flex-col items-center">
          <div className="space-y-12 w-full flex flex-col items-center">

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

              let emojiAnimClass = "";
              switch (post.maskTier) {
                case 1: emojiAnimClass = "emoji-pulse"; break;
                case 2: emojiAnimClass = "emoji-bounce"; break;
                case 3: emojiAnimClass = "emoji-wiggle"; break;
                case 4: emojiAnimClass = "emoji-pop"; break;
                case 5: emojiAnimClass = "emoji-shimmer"; break;
                default: emojiAnimClass = "emoji-pulse";
              }

              const emojiReactClass = surge ? "emoji-react-pop" : "";

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
                  {/* Left aura spine */}
                  <div
                    className="absolute left-0 top-0 h-full w-[6px] rounded-l-2xl"
                    style={{ background: auraColor(post.maskTier) }}
                  ></div>

                  {/* Emoji */}
                  <div
                    className={`emoji-glyph ${emojiAnimClass} ${emojiReactClass}`}
                    style={{ color: auraColor(post.maskTier) }}
                  >
                    {post.maskTier === 1 && "😶‍🌫️"}
                    {post.maskTier === 2 && "😤"}
                    {post.maskTier === 3 && "😊"}
                    {post.maskTier === 4 && "🤩"}
                    {post.maskTier === 5 && "😇"}
                  </div>

                  {/* Surge */}
                  {surge && <div className="surge-flash absolute inset-0 rounded-2xl"></div>}
                  {surge && <div className="surge-ripple"></div>}

                  {debugAscension && (
                    <div className="absolute top-1 right-2 text-xs text-red-500 font-bold">
                      DEBUG S{stage}
                    </div>
                  )}

                  {stage >= 4 && <div className="ascension-ring" />}
                  {stage >= 5 && <div className="ascension-halo" />}

                  {/* Spirit particles */}
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

                  {/* Spirit Score */}
                  <div
                    className="text-xs font-semibold mb-2 tracking-wide"
                    style={{ color: auraColor(post.maskTier) }}
                  >
                    Spirit Score: {score}
                  </div>

                  {/* Content */}
                  <p className="whitespace-pre-line text-lg leading-relaxed text-gray-800">
                    {post.content}
                  </p>

                  <div className="mt-6 flex justify-between text-sm text-gray-500">
                    <span>Mask: {post.maskTier}</span>
                    <span>{new Date(post.createdAt).toLocaleString()}</span>
                  </div>

                  {/* ReactionBar */}
                  <ReactionBar
                    postId={String(post.id)}
                    userId={"viewer-demo-001"}
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
                    onReact={() => fetchPosts()}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Composer */}
        <FloatingComposer onPost={fetchPosts} />
      </div>
    </>
  );
}
