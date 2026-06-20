"use client";

import { useRef, useState } from "react";

type SoundPost = {
  id: string;
  title: string;
  audio_url: string;
  creator_name: string;
  created_at: string;
};

export default function SoundPostCard({ post }: { post: SoundPost }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function handlePlay() {
    if (!audioRef.current) return;
    audioRef.current.play();
    setIsPlaying(true);
  }

  function handlePause() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold">{post.title}</h2>
      <p className="text-gray-400 text-sm mb-4">
        Uploaded by {post.creator_name} • {post.created_at}
      </p>

      <audio ref={audioRef} src={post.audio_url} preload="metadata" />

      <div className="w-full h-24 bg-gray-700 rounded mb-4 flex items-center justify-center text-gray-400">
        Waveform preview
      </div>

      <div className="flex gap-4 mb-4">
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-500"
          >
            Play
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="bg-red-600 px-4 py-2 rounded hover:bg-red-500"
          >
            Pause
          </button>
        )}
      </div>

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
