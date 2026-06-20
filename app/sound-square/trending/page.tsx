"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import SoundPostCard from "@/components/sound-square/SoundPostCard";

type TrendingPost = {
  post_id: string;
  title: string;
  audio_url: string;
  creator_name: string;
  created_at: string;
  trend_score: number;
};

export default function SoundSquareTrending() {
  const supabase = createSupabaseBrowserClient();
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("sound_trending")
        .select("*")
        .order("trend_score", { ascending: false })
        .limit(50);

      if (error) {
        console.error(error);
      } else {
        setPosts(data || []);
      }
      setLoading(false);
    })();
  }, [supabase]);

  return (
    <div className="min-h-screen text-white p-6">
      <h1 className="text-4xl font-bold mb-6">Trending on SoundSquare</h1>

      {loading && <p>Loading trending sounds...</p>}

      <div className="flex flex-col gap-6">
        {posts.map((p) => (
          <SoundPostCard
            key={p.post_id}
            post={{
              id: p.post_id,
              title: p.title,
              audio_url: p.audio_url,
              creator_name: p.creator_name,
              created_at: p.created_at,
            }}
          />
        ))}
      </div>
    </div>
  );
}
