"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import Link from "next/link";
import VisionCard from "@/app/vision-square/components/VisionCard";

export default function VisionSquareTrending() {
  const supabase = useSupabase();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      setLoading(true);

      // ⭐ Trending logic: highest spirit_score first
      const { data, error } = await supabase
        .from("vision_posts")
        .select("*")
        .order("spirit_score", { ascending: false })
        .limit(25);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setPosts(data || []);
      setLoading(false);
    }

    fetchTrending();
  }, [supabase]);

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

      <h1 className="text-3xl font-bold mb-6">Trending on Vision Square</h1>

      {loading && <p className="text-gray-400">Loading trending posts…</p>}

      {!loading && posts.length === 0 && (
        <p className="text-gray-500">No trending posts yet.</p>
      )}

      {/* Render trending posts */}
      {posts.map((post) => (
        <VisionCard key={post.id} post={post} />
      ))}
    </div>
  );
}
