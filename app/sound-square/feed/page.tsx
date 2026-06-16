"use client";

import { useEffect, useState } from "react";

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

  // Placeholder fetch — will connect to Supabase later
  useEffect(() => {
    async function loadPosts() {
      // For now, fake data so UI works
      const fakePosts: SoundPost[] = [
        {
          id: "1",
          title: "Spirit Drums",
          audio_url: "",
          creator_name: "Maskling_001",
          created_at: "2026-06-16",
        },
        {
          id: "2",
          title: "Moonlight Chant",
          audio_url: "",
          creator_name: "Maskling_002",
          created_at: "2026-06-15",
        },
      ];

      setPosts(fakePosts);
      setLoading(false);
    }

    loadPosts();
  }, []);

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
