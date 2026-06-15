"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "@/context/UserContext";
import FloatingComposer from "@/components/FloatingComposer";
import ReactionBar from "@/components/ReactionBar"; // ⭐ Make sure this path is correct

type Post = {
  id: number;
  creator_id: string;
  content: string;
  spirit_score: number | null;
  created_at: string;
  automask: number | null;
  spiritscore: number | null;
  mask: number | null;
};

export default function PlazaPage() {
  const { user, loading } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchPosts() {
    setLoadingPosts(true);
    setError(null);

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message || "Error loading posts");
    } else {
      setPosts(data || []);
    }

    setLoadingPosts(false);
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  function handlePostCreated(newPost: Post) {
    setPosts((prev) => [newPost, ...prev]);
  }

  function handleReactionUpdated(updatedPost: Post) {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Mmanwu Plaza</h1>
            <p className="text-sm text-zinc-400">
              Supabase‑powered emotional square.
            </p>
          </div>

          <div className="text-right">
            {loading ? (
              <span className="text-xs text-zinc-500">Loading user…</span>
            ) : user ? (
              <span className="text-xs text-zinc-500">
                Logged in as {user.username || user.id}
              </span>
            ) : (
              <span className="text-xs text-zinc-500">Not logged in</span>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 border border-red-500/40 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {loadingPosts ? (
          <div className="text-sm text-zinc-400">Loading posts…</div>
        ) : posts.length === 0 ? (
          <div className="text-sm text-zinc-400">
            No posts yet. Be the first to write.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <article
                key={post.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                  <span>Mask: {post.mask ?? 0}</span>
                  <span>
                    Spirit score:{" "}
                    <span className="font-semibold text-purple-300">
                      {post.spirit_score ?? post.spiritscore ?? 0}
                    </span>
                  </span>
                </div>

                <p className="text-sm text-zinc-100 whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* ⭐ ReactionBar FIXED — postId is now a number */}
                <ReactionBar
                  postId={post.id} // ⭐ FIXED
                  creatorId={post.creator_id}
                  reactions={{}} // Supabase version doesn't use reaction counts yet
                  spiritScore={post.spirit_score ?? post.spiritscore ?? 0}
                  positivityRatio={0.5}
                  onReact={handleReactionUpdated}
                />

                <div className="mt-2 text-[11px] text-zinc-500 flex justify-between">
                  <span>Creator: {post.creator_id}</span>
                  <span>
                    {new Date(post.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <FloatingComposer onPost={handlePostCreated} />
    </div>
  );
}
