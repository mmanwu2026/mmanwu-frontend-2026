"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import Link from "next/link";
import VisionCard from "@/app/vision-square/components/VisionCard";

export default function VisionSquareFeed() {
  const supabase = useSupabase();
  const { user } = useUser();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [endReached, setEndReached] = useState(false);

  const PAGE_SIZE = 10;

  async function fetchPosts(initial = false) {
    if (initial) setLoading(true);
    else setFetchingMore(true);

    const { data, error } = await supabase
      .from("vision_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(posts.length, posts.length + PAGE_SIZE - 1);

    if (error) {
      console.error(error);
      setLoading(false);
      setFetchingMore(false);
      return;
    }

    if (data.length < PAGE_SIZE) setEndReached(true);

    setPosts((prev) => [...prev, ...data]);
    setLoading(false);
    setFetchingMore(false);
  }

  useEffect(() => {
    fetchPosts(true);
  }, []);

  useEffect(() => {
    function onScroll() {
      if (endReached || fetchingMore) return;

      const scrollPos =
        window.innerHeight + document.documentElement.scrollTop;
      const bottom = document.documentElement.offsetHeight - 300;

      if (scrollPos >= bottom) fetchPosts(false);
    }

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [posts, fetchingMore, endReached]);

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">

      {/* Navigation */}
      <div className="mb-6 flex justify-between items-center">

        {/* Back to Plaza */}
        <Link
          href="/plaza"
          className="text-gray-300 hover:text-purple-300 transition"
        >
          ← Plaza
        </Link>

        {/* Upload Vision */}
        <Link
          href="/vision-square/create"
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
        >
          + Upload Vision
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Vision Square</h1>

      {loading && <p className="text-gray-400">Loading Vision posts…</p>}

      {/* VisionCard integration */}
      {posts.map((post) => (
        <VisionCard key={post.id} post={post} />
      ))}

      {fetchingMore && (
        <p className="text-gray-400 text-center mt-4">Loading more…</p>
      )}

      {endReached && (
        <p className="text-gray-500 text-center mt-6">
          You’ve reached the end of Vision Square.
        </p>
      )}

      {/* ⭐ FLOATING COMPOSER */}
      <Link
        href="/vision-square/create"
        className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-full shadow-lg transition"
      >
        + Vision Composer
      </Link>
    </div>
  );
}
