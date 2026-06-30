"use client";

import { useRef, useState, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import SoundReactionBar from "@/components/sound-square/SoundReactionBar";

import type { CardSoundPost, ReactionCounts } from "@/app/sound-square/loadSoundPosts";
import Link from "next/link";

const MASK_EMOJI: Record<number, string> = {
  1: "😶‍🌫️",
  2: "😤",
  3: "😊",
  4: "🤩",
  5: "😇",
  6: "🔱",
};

export default function SoundPostCard({
  post,
  isTrending = false,
}: {
  post: CardSoundPost;
  isTrending?: boolean;
}) {
  const supabase = useSupabase();
  const { user } = useUser();
  const router = useRouter();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [reactions, setReactions] = useState<ReactionCounts>(post.reactions);
  const [spiritScore, setSpiritScore] = useState(post.spirit_score);
  const [positivityRatio, setPositivityRatio] = useState(post.positivity_ratio);
  const [autoMask, setAutoMask] = useState(post.automask);
  const [intensity, setIntensity] = useState(0);

  // ⭐ AUDIO INTENSITY VISUALIZER
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
      const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
      const normalized = Math.min(avg / 180, 1);
      setIntensity(normalized);

      // ⭐ SOUND-REACTIVE MASK BOOST
      if (normalized > 0.75 && autoMask < 6) {
        setAutoMask((prev) => Math.min(prev + 1, 6));
      }

      animationFrame = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrame);
      analyser.disconnect();
      src.disconnect();
      ctx.close();
    };
  }, [autoMask]);

  // ⭐ WAVEFORM VISUALIZER
  useEffect(() => {
    if (!canvasRef.current || !audioRef.current) return;

    const audio = audioRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audioCtx = new AudioContext();
    const src = audioCtx.createMediaElementSource(audio);
    const analyser = audioCtx.createAnalyser();

    analyser.fftSize = 2048;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    src.connect(analyser);
    analyser.connect(audioCtx.destination);

    let frame: number;

    const draw = () => {
      frame = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#9b5cf6";

      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    draw();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      audioCtx.close().catch(() => {});
    };
  }, []);

  // ⭐ RESTORED — Play / Pause Controls
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

  // ⭐ REFRESH REACTIONS — post_type = "sound"
  const refreshReactions = async () => {
    const { data: reactionRows } = await supabase
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
      mask6: 0,
    };

    let newSpirit = 0;
    let positiveCount = 0;
    let totalCount = 0;

    reactionRows?.forEach((r: { maskTier: number }) => {
      const key = `mask${r.maskTier}` as keyof ReactionCounts;
      newCounts[key] += 1;

      newSpirit += r.maskTier;
      totalCount += 1;

      if (r.maskTier >= 3) positiveCount += 1;
    });

    const newPositivity =
      totalCount > 0 ? positiveCount / totalCount : 0.5;

    let newAutoMask = 2;
    if (newSpirit > 20) newAutoMask = 3;
    if (newSpirit > 100) newAutoMask = 4;
    if (newSpirit > 300) newAutoMask = 5;
    if (newSpirit > 500) newAutoMask = 6;

    // ⭐ SOUND-REACTIVE BOOST
    if (intensity > 0.75 && newAutoMask < 6) {
      newAutoMask += 1;
    }

    setReactions(newCounts);
    setSpiritScore(newSpirit);
    setPositivityRatio(newPositivity);
    setAutoMask(newAutoMask);

    // ⭐ CRITICAL FIX: Refresh FEED
    router.refresh();
  };

  const scale = 1 + intensity * 0.2;

  return (
    <div
      className={`
        bg-gray-800 p-6 rounded-lg shadow-lg transition-all
        ${isTrending ? "shadow-[0_0_25px_rgba(168,85,247,0.7)] border border-purple-500 animate-pulse" : ""}
      `}
    >
      {isTrending && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-purple-600 px-2 py-1 rounded-full">
            Trending
          </span>
          <span className="text-xl">{MASK_EMOJI[autoMask]}</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold">{post.title}</h2>
          <p className="text-gray-400 text-sm">
            Uploaded by{" "}
            <Link
              href={`/profile/${post.creator_id}`}
              className="text-purple-300 hover:text-purple-400 underline"
            >
              {post.users?.username ?? "Unknown"}
            </Link>{" "}
            • {post.created_at}
          </p>
        </div>
      </div>

      <audio ref={audioRef} src={post.audio_url} preload="metadata" />

      <canvas
        ref={canvasRef}
        className="w-full h-24 bg-gray-700 rounded mb-4"
        style={{ transform: `scale(${scale})` }}
      />

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

{/* ⭐ COMMENTS PREVIEW */}
{post.comments && post.comments.length > 0 && (
  <div className="mt-4">
    <p className="text-gray-300 text-sm font-medium mb-2">
      💬 {post.comment_count} comments
    </p>

    {post.comments.slice(0, 2).map((comment: any) => (
      <div key={comment.id} className="mb-3">
        <div className="flex items-center gap-2">
          <img
            src={comment.profiles?.avatar_url || "/default-avatar.png"}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm font-semibold text-purple-200">
            {comment.profiles?.username || "unknown"}
          </span>
        </div>

        <p className="ml-8 text-gray-400 text-sm">
          {comment.content}
        </p>
      </div>
    ))}
  </div>
)}

      <SoundReactionBar
        postId={post.id}
        creatorId={post.creator_id}
        reactions={reactions}
        onReact={refreshReactions}
      />
    </div>
  );
}
