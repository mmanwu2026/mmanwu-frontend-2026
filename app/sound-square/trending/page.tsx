"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import SoundPostCard, { CardSoundPost } from "@/components/sound-square/SoundPostCard";

type TrendingPost = {
  post_id: string;
  title: string;
  audio_url: string;
  creator_name: string;
  created_at: string;
  trend_score: number;
};

export default function SoundSquareTrending() {
  // ⭐ GLOBAL SUPABASE CLIENT — SAFE
  const supabase = useSupabase();

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
        {posts.map((p) => {
          const cardPost: CardSoundPost = {
            id: p.post_id,
            title: p.title,
            audio_url: p.audio_url,
            creator_name: p.creator_name,
            created_at: p.created_at,

            reactions: {
              mask1: 0,
              mask2: 0,
              mask3: 0,
              mask4: 0,
              mask5: 0,
              mask6: 0,
            },

            spiritScore: 0,
            positivityRatio: 0.5,
            autoMask: 2,
          };

          return <SoundPostCard key={p.post_id} post={cardPost} />;
        })}
      </div>
    </div>
  );
}
