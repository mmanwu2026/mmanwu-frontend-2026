"use client";

import { useEffect, useState } from "react";
import ReactionBar from "@/components/ReactionBar";

// Define a Post type so TypeScript is happy during Vercel builds
type Post = {
  id: number;
  content: string;
  mask: number;
  createdAt: string;
  creatorId?: string; // add this if your backend returns creatorId
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

        // Add empty reaction counts for now
        const withReactions = data.map((p) => ({
          ...p,
          reactions: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        }));

        const sorted = withReactions.sort(
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
            className="border p-5 rounded-lg shadow-sm bg-white"
          >
            <p className="whitespace-pre-line text-lg">{post.content}</p>

            <div className="mt-4 flex justify-between text-sm text-gray-500">
              <span>Mask: {post.mask}</span>
              <span>{new Date(post.createdAt).toLocaleString()}</span>
            </div>

            {/* ⭐ NEW Reaction Bar */}
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
