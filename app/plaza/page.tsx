// force plaza rebuild
"use client";

import { useEffect, useState } from "react";
import ReactionBar from "@/components/ReactionBar";

// Define a Post type so TypeScript is happy during Vercel builds
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

  // ⭐ C4 Debug Mode toggle
  const [debugAscension, setDebugAscension] = useState(false);

  // ⭐ Press "D" to toggle debug mode
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "d") {
        setDebugAscension((prev) => !prev);
        console.log("C4 Debug Mode:", !debugAscension);
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

        if (!res.ok) {
          throw new Error("Failed to fetch posts");
        }

        const data: Post[] = await res.json();

        const patched = data.map((p) => ({
          ...p,
          spiritScore: p.spiritScore ?? 0,
          reactions: p.reactions ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        }));

        const sorted = patched.sort(
          (a: Post, b: Post) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setPosts(sorted);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setError("Unable to load posts.");
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  // ⭐ Mask → color mapping
  function auraColor(mask: number) {
    switch (mask) {
      case 1:
        return "#7C3AED"; // violet — Dark Whisper
      case 2:
        return "#DC2626"; // red — Fierce Awakener
      case 3:
        return "#22C55E"; // green — Uplift
      case 4:
        return "#FACC15"; // gold — Harmony
      case 5:
        return "#3B82F6"; // blue — Witness
      default:
        return "#22C55E"; // fallback
    }
  }

  // ⭐ Aura style generator (still old version — Step 2 will upgrade this)
  function auraStyle(score: number = 0, mask: number) {
    const color = auraColor(mask);

    if (score < 6) {
      return { borderColor: color };
    }

    if (score < 16) {
      return {
        borderColor: color,
        boxShadow: `0 0 10px ${color}33`,
        animation: "aura-breathe 3s ease-in-out infinite",
      };
    }

    if (score < 31) {
      return {
        borderColor: color,
        boxShadow: `0 0 15px ${color}55`,
        animation: "aura-breathe 2s ease-in-out infinite",
      };
    }

    return {
      borderColor: color,
      boxShadow: `0 0 20px ${color}77`,
      animation: "aura-pulse 1.5s ease-in-out infinite",
    };
  }

  return (
    <div className="p-10 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Mmanwu Plaza</h1>

      {loading && <p className="text-gray-500">Loading posts…</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && posts.length === 0 && (
        <p className="text-gray-500">No posts yet…</p>
      )}

      <div className="space-y-6">
        {posts.map((post) => {
          // ⭐ C6 Dynamics — Step 1 (core metrics)
          const score = post.spiritScore ?? 0;

          const totalReactions =
            (post.reactions?.[1] ?? 0) +
            (post.reactions?.[2] ?? 0) +
            (post.reactions?.[3] ?? 0) +
            (post.reactions?.[4] ?? 0) +
            (post.reactions?.[5] ?? 0);

          const positiveReactions =
            (post.reactions?.[3] ?? 0) +
            (post.reactions?.[4] ?? 0) +
            (post.reactions?.[5] ?? 0);

          const negativeReactions =
            (post.reactions?.[1] ?? 0) +
            (post.reactions?.[2] ?? 0);

          const positivityRatio =
            totalReactions > 0 ? positiveReactions / totalReactions : 0.5;

          // ⭐ C4 Stage Logic (with Debug Override)
          let stage;
          if (debugAscension) {
            stage = (post.id % 5) + 1; // cycle stages 1–5
          } else {
            stage =
              score < 6
                ? 1
                : score < 16
                ? 2
                : score < 31
                ? 3
                : score < 51
                ? 4
                : 5;
          }

          return (
            <div
              key={post.id}
              className="p-5 rounded-lg bg-white transition-all duration-300 relative border"
              style={
                {
                  "--aura-color": auraColor(post.mask),
                  // ⭐ Step 1: still using old auraStyle; Step 2 will upgrade this
                  ...auraStyle(score, post.mask),
                } as unknown as React.CSSProperties
              }
            >
              {/* ⭐ Debug Badge */}
              {debugAscension && (
                <div className="absolute top-1 right-2 text-xs text-red-500 font-bold">
                  DEBUG S{stage}
                </div>
              )}

              {/* ⭐ C4 Ascension Ring */}
              {stage >= 4 && <div className="ascension-ring" />}

              {/* ⭐ C4 Halo Crown */}
              {stage >= 5 && <div className="ascension-halo" />}

              {/* ⭐ C5 Spirit Sparks */}
              {stage >= 4 && (
                <>
                  <div
                    className="spirit-spark"
                    style={{
                      top: "20%",
                      left: "40%",
                      animationDelay: "0s",
                      background: auraColor(post.mask),
                    }}
                  />
                  <div
                    className="spirit-spark"
                    style={{
                      top: "60%",
                      left: "55%",
                      animationDelay: "0.2s",
                      background: auraColor(post.mask),
                    }}
                  />
                  <div
                    className="spirit-spark"
                    style={{
                      top: "35%",
                      left: "70%",
                      animationDelay: "0.4s",
                      background: auraColor(post.mask),
                    }}
                  />
                </>
              )}

              {/* Floating spirit particles for high-spirit posts */}
              {score >= 16 && (
                <>
                  <div
                    className="spirit-particle"
                    style={{
                      top: "10%",
                      left: "5%",
                      background: auraColor(post.mask),
                    }}
                  />
                  <div
                    className="spirit-particle"
                    style={{
                      top: "50%",
                      left: "90%",
                      animationDelay: "1s",
                      background: auraColor(post.mask),
                    }}
                  />
                  <div
                    className="spirit-particle"
                    style={{
                      top: "80%",
                      left: "20%",
                      animationDelay: "2s",
                      background: auraColor(post.mask),
                    }}
                  />
                </>
              )}

              {/* Spirit Score Badge */}
              <div
                className="text-xs font-semibold mb-1"
                style={{ color: auraColor(post.mask) }}
              >
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
