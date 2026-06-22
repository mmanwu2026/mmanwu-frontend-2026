"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import SoundPostCard from "@/components/sound-square/SoundPostCard";
import { loadSoundPosts, CardSoundPost } from "./loadSoundPosts";

export default function SoundSquarePage() {
  const supabase = useSupabase();
  const [posts, setPosts] = useState<CardSoundPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      setLoading(true);
      const data = await loadSoundPosts(supabase);
      setPosts(data);
      setLoading(false);
    }
    run();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading Sound Square...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {posts.length === 0 && (
          <p className="text-zinc-500 text-center">No sounds yet.</p>
        )}

        {posts.map((post) => (
          <SoundPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
