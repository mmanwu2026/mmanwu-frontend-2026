"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  const supabase = createSupabaseBrowserClient();

  const [posts, setPosts] = useState<SoundPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Load initial page
  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    setLoading(true);

    const { data, error } = await supabase
      .from("sound_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error(error);
      return;
    }

    setPosts(data);
    if (data.length > 0) {
      setCursor(data[data.length - 1].created_at);
    }
    if (data.length < PAGE_SIZE) {
      setHasMore(false);
    }

    setLoading(false);
  }

  // Load next page using cursor
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || !hasMore) return;

    setLoadingMore(true);

    const { data, error } = await supabase
      .from("sound_posts")
      .select("*")
      .lt("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error(error);
      setLoadingMore(false);
      return;
    }

    if (data.length === 0) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    setPosts((prev) => [...prev, ...data]);
    setCursor(data[data.length - 1].created_at);

    if (data.length < PAGE_SIZE) {
      setHasMore(false);
    }

    setLoadingMore(false);
  }, [cursor, loadingMore, hasMore, supabase]);

  // IntersectionObserver to auto-load more
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="min-h-screen text-white p-6">
      <h1 className="text-4xl font-bold mb-6">Sound Square Feed</h1>

      {loading && <p>Loading sounds...</p>}

      <div className="flex flex-col gap-6 mb-6">
        {posts.map((post) => (
          <SoundPostCard key={post.id} post={post} />
        ))}
      </div>

      {hasMore && (
        <div ref={loadMoreRef} className="h-10 flex justify-center items-center">
          {loadingMore && <p className="text-gray-400">Loading more...</p>}
        </div>
      )}

      {!hasMore && (
        <p className="text-gray-500 text-sm mt-4 text-center">
          You’ve reached the end of the feed.
        </p>
      )}
    </div>
  );
}
