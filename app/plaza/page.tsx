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

  // ⭐ Aura class generator
  function auraClass(score: number = 0) {
    if (score < 6)
      return "border-gray-300";

    if (score < 16)
      return "border-green-400 shadow-md shadow-green-200 animate-[aura-breathe_3s_ease-in-out_infinite]";

    if (score < 31)
      return "border-green-500 shadow-lg shadow-green-300 animate-[aura-breathe_2s_ease-in-out_infinite]";

    return "border-green-600 shadow-xl shadow-green-400 animate-[aura-pulse_1.5s_ease-in-out_infinite]";
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
        {posts.map((post) => (
          <div
            key={post.id}
            className={`
              p-5 rounded-lg bg-white transition-all duration-300 relative
              border ${auraClass(post.spiritScore)}
            `}
          >
            {/* Floating spirit particles for high-spirit posts */}
            {post.spiritScore !== undefined && post.spiritScore >= 16 && (
              <>
                <div
                  className="spirit-particle"
                  style={{ top: "10%", left: "5%" }}
                />
                <div
                  className="spirit-particle"
                  style={{
                    top: "50%",
                    left: "90%",
                    animationDelay: "1s",
                  }}
                />
                <div
                  className="spirit-particle"
                  style={{
                    top: "80%",
                    left: "20%",
                    animationDelay: "2s",
                  }}
                />
              </>
            )}

            {/* Spirit Score Badge */}
            <div className="text-xs text-green-700 font-semibold mb-1">
              Spirit Score: {post.spiritScore ?? 0}
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
        ))}
      </div>
    </div>
  );
}
