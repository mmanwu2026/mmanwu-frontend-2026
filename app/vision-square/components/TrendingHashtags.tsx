"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import Link from "next/link";

export default function TrendingHashtags() {
  const { supabase } = useSupabase();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrending() {
      const { data, error } = await supabase
        .from("trending_hashtags")
        .select("*");

      if (error) {
        console.error("Trending hashtag error:", error);
        setLoading(false);
        return;
      }

      // Normalize tag casing
      const normalized = (data || []).map((t: any) => ({
        tag: t.tag.toLowerCase(),
        usage_count: t.usage_count,
      }));

      setTags(normalized);
      setLoading(false);
    }

    loadTrending();
  }, [supabase]);

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3 text-purple-200">
          Trending Hashtags
        </h2>

        <div className="flex gap-3 flex-wrap">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="px-3 py-1 bg-gray-800 rounded-full text-gray-600 animate-pulse"
            >
              ######
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3 text-purple-200">
          Trending Hashtags
        </h2>
        <p className="text-gray-500">No trending hashtags yet.</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3 text-purple-200">
        Trending Hashtags
      </h2>

      <div className="flex gap-3 flex-wrap">
        {tags.map((t) => (
          <Link
            key={t.tag}
            href={`/vision-square/search?tag=${t.tag}`}
            className="px-3 py-1 bg-gray-800 rounded-full text-purple-300 hover:text-purple-400 transition text-sm"
          >
            #{t.tag} <span className="text-gray-500">({t.usage_count})</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
