"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import SoundPostCard, {
  CardSoundPost,
} from "@/components/sound-square/SoundPostCard";

const PAGE_SIZE = 20;

export default function SoundSquareFeed() {
  // ⭐ GLOBAL SUPABASE CLIENT — SAFE
  const supabase = useSupabase();

  const [posts, setPosts] = useState<CardSoundPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  async function loadPage(pageToLoad: number) {
    const from = pageToLoad * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("sound_posts")
      .select(`
        *,
        users:creator_id ( username )
      `)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error loading sound posts:", error);
      return;
    }

    if (!data || data.length === 0) {
      if (pageToLoad === 0) setPosts([]);
      setHasMore(false);
      return;
    }

    const converted: CardSoundPost[] = data.map((p: any) => ({
      id: p.id,
      title: p.title,
      audio_url: p.audio_url,
      creator_name: p.users?.username ?? "Unknown",
      created_at: p.created_at,

      reactions: {
        mask1: 0,
        mask2: 0,
        mask3: 0,
        mask4: 0,
        mask5: 0,
        mask6: 0,
      },

      spiritScore: p.spirit_score ?? 0,
      positivityRatio: 0.5,
      autoMask: 2,
    }));

    if (pageToLoad === 0) {
      setPosts(converted);
    } else {
      setPosts((prev) => [...prev, ...converted]);
    }

    if (data.length < PAGE_SIZE) setHasMore(false);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadPage(0);
      setLoading(false);
    })();
  }, []);

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
