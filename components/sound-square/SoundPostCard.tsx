"use client";

import { useRef, useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type SoundPost = {
  id: string;
  title: string;
  audio_url: string;
  creator_name: string;
  created_at: string;
};

type ReactionCounts = Record<`mask${1 | 2 | 3 | 4 | 5}`, number>;

export default function SoundPostCard({ post }: { post: SoundPost }) {
  const supabase = createSupabaseBrowserClient();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [reactions, setReactions] = useState<ReactionCounts>({
    mask1: 0,
    mask2: 0,
    mask3: 0,
    mask4: 0,
    mask5: 0,
  });

  const [intensity, setIntensity] = useState(0);

  // Beat‑reactive analyser
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    const ctx = new AudioContext();
    const src = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    src.connect(analyser);
    analyser.connect(ctx.destination);

    let animationFrame: number;

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);

      const avg =
        dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;

      const normalized = Math.min(avg / 180, 1);

      setIntensity(normalized);

      animationFrame = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrame);
      analyser.disconnect();
      src.disconnect();
      ctx.close();
    };
  }, []);

  // Load reaction counts
  useEffect(() => {
    async function loadReactions() {
      const { data, error } = await supabase
        .from("reactions")
        .select("maskTier")
        .eq("post_id", post.id)
        .eq("post_type", "sound");

      if (error) {
        console.error("Error loading reactions:", error);
        return;
      }

      const counts: ReactionCounts = {
        mask1: 0,
        mask2: 0,
        mask3: 0,
        mask4: 0,
        mask5: 0,
      };

      data?.forEach((r: { maskTier: number }) => {
        const key = `mask${r.maskTier}` as keyof ReactionCounts;
        counts[key] += 1;
      });

      setReactions(counts);
    }

    loadReactions();
  }, [post.id, supabase]);

  // Reaction click handler
  async function handleReaction(maskTier: number) {
    const { error } = await supabase.rpc("react_to_post", {
      p_post_id: post.id,
      p_post_type: "sound",
      p_maskTier: maskTier,
    });

    if (error) {
      console.error("Reaction error:", error);
      return;
    }

    const { data } = await supabase
      .from("reactions")
      .select("maskTier")
      .eq("post_id", post.id)
      .eq("post_type", "sound");

    const newCounts: ReactionCounts = {
      mask1: 0,
      mask2: 0,
      mask3: 0,
      mask4: 0,
      mask5: 0,
    };

    data?.forEach((r: { maskTier: number }) => {
      const key = `mask${r.maskTier}` as keyof ReactionCounts;
      newCounts[key] += 1;
    });

    setReactions(newCounts);
  }

  function handlePlay() {
    audioRef.current?.play();
    setIsPlaying(true);
  }

  function handlePause() {
    audioRef.current?.pause();
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
        <ReactionMask
          emoji="😶‍🌫️"
          count={reactions.mask1}
          onClick={() => handleReaction(1)}
          intensity={intensity}
        />
        <ReactionMask
          emoji="🔥"
          count={reactions.mask2}
          onClick={() => handleReaction(2)}
          intensity={intensity}
        />
        <ReactionMask
          emoji="😄"
          count={reactions.mask3}
          onClick={() => handleReaction(3)}
          intensity={intensity}
        />
        <ReactionMask
          emoji="🌌"
          count={reactions.mask4}
          onClick={() => handleReaction(4)}
          intensity={intensity}
        />
        <ReactionMask
          emoji="✨"
          count={reactions.mask5}
          onClick={() => handleReaction(5)}
          intensity={intensity}
        />
      </div>
    </div>
  );
}

function ReactionMask({
  emoji,
  count,
  onClick,
  intensity,
}: {
  emoji: string;
  count: number;
  onClick: () => void;
  intensity: number;
}) {
  const scale = 1 + intensity * 0.4;
  const glow = intensity * 0.7;

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center cursor-pointer transition"
      style={{
        transform: `scale(${scale})`,
        filter: `drop-shadow(0 0 ${glow}rem rgba(255,255,255,0.6))`,
      }}
    >
      <div className="text-4xl">{emoji}</div>
      <p className="text-gray-400 text-xs mt-1">{count}</p>
    </div>
  );
}
