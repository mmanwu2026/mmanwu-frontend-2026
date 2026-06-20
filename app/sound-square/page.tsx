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

export default function SoundSquareFeed() {
  const [posts, setPosts] = useState<SoundPost[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function loadPosts() {
      const { data, error } = await supabase
        .from("sound_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading sound posts:", error);
        return;
      }

      setPosts(data || []);
      setLoading(false);
    }

    loadPosts();
  }, [supabase]);

  return (
    <div className="min-h-screen text-white p-6">
      <h1 className="text-4xl font-bold mb-6">Sound Square Feed</h1>

      {loading && <p>Loading sounds...</p>}

      {!loading && posts.length === 0 && (
        <p className="text-gray-400">No sound posts yet. Be the first to upload.</p>
      )}

      <div className="flex flex-col gap-6">
        {posts.map((post) => (
          <SoundPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
