// force plaza rebuild
"use client";

import { useEffect, useState, useRef } from "react";
import ReactionBar from "@/components/ReactionBar";

type Post = {
  id: number;
  content: string;
  mask: number;
  createdAt: string;
  creatorId?: string;
  spiritScore?: number;
  reactions?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
};

export default function PlazaPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [debugAscension, setDebugAscension] = useState(false);

  const prevPositivityMap = useRef<Record<number, number>>({});
  const prevPositiveReactionsMap = useRef<Record<number, number>>({});

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "d") {
        setDebugAscension((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [debugAscension]);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch(
          "https://mmanwu-clean-production-6465.up.railway.app/plaza",
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Failed to fetch posts");

        const data: Post[] = await res.json();

        const patched = data.map((p) => ({
          ...p,
          spiritScore: p.spiritScore ?? 0,
          reactions: p.reactions ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
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

    fetchPosts();
  }, []);

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
      boxShadow: `0 0 10px ${color}33`,
      animation: "aura-breathe 3s ease-in-out infinite",
    };
    if (finalLevel === 2) return {
      borderColor: color,
      boxShadow: `0 0 15px ${color}55`,
      animation: "aura-breathe 2s ease-in-out infinite",
    };
    return {
      borderColor: color,
      boxShadow: `0 0 20px ${color}77`,
      animation: "aura-pulse 1.5s ease-in-out infinite",
    };
  }

  return (
    <div className="p-10 w-full max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Mmanwu Plaza</h1>

      {loading && <p>Loading posts…</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && posts.length === 0 && <p>No posts yet…</p>}

      <div className="space-y-6">
        {posts.map((post) => {
          const score = post.spiritScore ?? 0;

          const total =
            (post.reactions?.[1] ?? 0) +
            (post.reactions?.[2] ?? 0) +
            (post.reactions?.[3] ?? 0) +
            (post.reactions?.[4] ?? 0) +
            (post.reactions?.[5] ?? 0);

          const positive =
            (post.reactions?.[3] ?? 0) +
            (post.reactions?.[4] ?? 0) +
            (post.reactions?.[5] ?? 0);

          const positivityRatio = total > 0 ? positive / total : 0.5;

          let baseStage =
            score < 6 ? 1 :
            score < 16 ? 2 :
            score < 31 ? 3 :
            score < 51 ? 4 : 5;

          const stageBoost = positivityRatio > 0.7 ? 1 : 0;
          const stageDampen = positivityRatio < 0.3 ? -1 : 0;

          let stage = Math.max(1, Math.min(5, baseStage + stageBoost + stageDampen));

          if (debugAscension) stage = (post.id % 5) + 1;

          const prevPos = prevPositivityMap.current[post.id] ?? positivityRatio;
          const prevPosReacts = prevPositiveReactionsMap.current[post.id] ?? positive;

          const positivitySpike = positivityRatio - prevPos > 0.25;
          const newPositiveReaction = positive > prevPosReacts;

          const surge = positivitySpike || newPositiveReaction;

          prevPositivityMap.current[post.id] = positivityRatio;
          prevPositiveReactionsMap.current[post.id] = positive;

          return (
            <div
              key={post.id}
              className="p-7 rounded-lg bg-white transition-all duration-300 relative border overflow-visible min-h-[180px] isolate-layout"
              style={{
                "--aura-color": auraColor(post.mask),
                ...auraStyle(score, post.mask, positivityRatio),
              } as React.CSSProperties}
            >
              {surge && <div className="surge-flash absolute inset-0 rounded-lg"></div>}
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
                  <div className="spirit-spark" style={{ top: "20%", left: "40%", background: auraColor(post.mask) }} />
                  {positivityRatio > 0.6 && (
                    <div className="spirit-spark" style={{ top: "60%", left: "55%", animationDelay: "0.2s", background: auraColor(post.mask) }} />
                  )}
                  {positivityRatio > 0.8 && (
                    <div className="spirit-spark" style={{ top: "35%", left: "70%", animationDelay: "0.4s", background: auraColor(post.mask) }} />
                  )}
                </>
              )}

              {score >= 16 && (
                <>
                  <div className="spirit-particle" style={{ top: "10%", left: "5%", background: auraColor(post.mask) }} />
                  <div className="spirit-particle" style={{ top: "50%", left: "90%", animationDelay: "1s", background: auraColor(post.mask) }} />
                  <div className="spirit-particle" style={{ top: "80%", left: "20%", animationDelay: "2s", background: auraColor(post.mask) }} />
                </>
              )}

              <div className="text-xs font-semibold mb-1" style={{ color: auraColor(post.mask) }}>
                Spirit Score: {score}
              </div>

              <p className="whitespace-pre-line text-lg">{post.content}</p>

              <div className="mt-4 flex justify-between text-sm text-gray-500">
                <span>Mask: {post.mask}</span>
                <span>{new Date(post.createdAt).toLocaleString()}</span>
              </div>

              <ReactionBar
                postId={String(post.id)}
                creatorId={post.creatorId ?? "demo-creator-123"}
                currentUserId={"demo-user-123"}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
