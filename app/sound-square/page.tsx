"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import SoundPostCard from "@/components/sound-square/SoundPostCard";

type SoundPost = {
  id: string;
  title: string;
  audio_url: string;
  creator_name: string;
  created_at: string;
};

const PAGE_SIZE = 20;

export default function SoundSquareFeed() {
  const [posts, setPosts] = useState<SoundPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const supabase = createSupabaseBrowserClient();

  async function loadPage(pageToLoad: number) {
    const from = pageToLoad * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("sound_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error loading sound posts:", error);
      return;
    }

    if (!data || data.length === 0) {
      if (pageToLoad === 0) {
        setPosts([]);
      }
      setHasMore(false);
      return;
    }

    if (pageToLoad === 0) {
      setPosts(data);
    } else {
      setPosts((prev) => [...prev, ...data]);
    }

    if (data.length < PAGE_SIZE) {
      setHasMore(false);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadPage(0);
      setLoading(false);
    })();
  }, [supabase]);

  async function handleLoadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await loadPage(nextPage);
    setPage(nextPage);
    setLoadingMore(false);
  }

  return (
    <div className="min-h-screen text-white p-6">
      <h1 className="text-4xl font-bold mb-6">Sound Square Feed</h1>

      {loading && <p>Loading sounds...</p>}

      {!loading && posts.length === 0 && (
        <p className="text-gray-400">No sound posts yet. Be the first to upload.</p>
      )}

      <div className="flex flex-col gap-6 mb-6">
        {posts.map((post) => (
          <SoundPostCard key={post.id} post={post} />
        ))}
      </div>

      {!loading && hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500 disabled:opacity-50"
        >
          {loadingMore ? "Loading more..." : "Load more"}
        </button>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="text-gray-500 text-sm mt-4">You’ve reached the end of the feed.</p>
      )}
    </div>
  );
}
