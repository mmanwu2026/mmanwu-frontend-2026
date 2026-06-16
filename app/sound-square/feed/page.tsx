"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

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

  const supabase = createClientComponentClient();

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

      <div className="flex flex-col gap-6">
        {posts.map((post) => (
          <SoundPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

function SoundPostCard({ post }: { post: SoundPost }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold">{post.title}</h2>
      <p className="text-gray-400 text-sm mb-4">
        Uploaded by {post.creator_name} • {post.created_at}
      </p>

      {/* Waveform placeholder */}
      <div className="w-full h-24 bg-gray-700 rounded mb-4 flex items-center justify-center text-gray-400">
        Waveform preview
      </div>

      {/* Audio controls */}
      <div className="flex gap-4 mb-4">
        <button className="bg-green-600 px-4 py-2 rounded hover:bg-green-500">
          Play
        </button>
        <button className="bg-red-600 px-4 py-2 rounded hover:bg-red-500">
          Pause
        </button>
      </div>

      {/* Reaction masks */}
      <div className="flex gap-6">
        <ReactionMask emoji="😶‍🌫️" />
        <ReactionMask emoji="🔥" />
        <ReactionMask emoji="😄" />
        <ReactionMask emoji="🌌" />
        <ReactionMask emoji="✨" />
      </div>
    </div>
  );
}

function ReactionMask({ emoji }: { emoji: string }) {
  return (
    <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition">
      <div className="text-4xl">{emoji}</div>
      <p className="text-gray-400 text-xs mt-1">0</p>
    </div>
  );
}
