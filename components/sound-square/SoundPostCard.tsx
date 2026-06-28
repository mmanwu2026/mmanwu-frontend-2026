"use client";

import { useRef, useState, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import ReactionBar from "@/components/plaza/ReactionBar";
import type { CardSoundPost, ReactionCounts } from "@/app/sound-square/loadSoundPosts";
import Link from "next/link"

export default function SoundPostCard({
  post,
  isTrending = false,   // ⭐ NEW PROP
}: {
  post: CardSoundPost;
  isTrending?: boolean;
}) {
  const supabase = useSupabase();
  const { user } = useUser();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [reactions, setReactions] = useState<ReactionCounts>(post.reactions);
  const [spiritScore, setSpiritScore] = useState(post.spiritScore);
  const [positivityRatio, setPositivityRatio] = useState(post.positivityRatio);

  const [intensity, setIntensity] = useState(0);

  // AUDIO INTENSITY VISUALIZER
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

  // WAVEFORM VISUALIZER
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

  // ⭐ REFRESH REACTIONS — FIXED (post_type = "sound")
  const refreshReactions = async () => {
    const { data: reactionRows } = await supabase
      .from("reactions")
      .select("maskTier, value")
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
    let weightedPositive = 0;

    reactionRows?.forEach((r: { maskTier: number; value: number | null }) => {
      const key = `mask${r.maskTier}` as keyof ReactionCounts;
      newCounts[key] += 1;
      const v = r.value ?? 0;
      newSpirit += v;
      if (v > 0) weightedPositive += v;
    });

    const weightedTotal = Math.abs(newSpirit);
    const newPositivity =
      weightedTotal > 0 ? weightedPositive / weightedTotal : 0.5;

    setReactions(newCounts);
    setSpiritScore(newSpirit);
    setPositivityRatio(newPositivity);
  };

  function handlePlay() {
    audioRef.current?.play();
    setIsPlaying(true);
  }

  function handlePause() {
    audioRef.current?.pause();
    setIsPlaying(false);
  }

  const scale = 1 + intensity * 0.2;

  return (
    <div
      className={`
        bg-gray-800 p-6 rounded-lg shadow-lg transition-all
        ${isTrending ? "shadow-[0_0_25px_rgba(168,85,247,0.7)] border border-purple-500 animate-pulse" : ""}
      `}
    >
      {isTrending && (
        <span className="text-xs bg-purple-600 px-2 py-1 rounded-full mb-2 inline-block">
          Trending
        </span>
      )}

      <h2 className="text-xl font-semibold">{post.title}</h2>
      <p className="text-gray-400 text-sm mb-4">
  Uploaded by{" "}
  <Link
    href={`/profile/${post.creator_id}`}
    className="text-purple-300 hover:text-purple-400 underline"
  >
    {post.creator_name}
  </Link>
  {" "}• {post.created_at}
</p>

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

      <ReactionBar
        postType="sound"
        postId={post.id}
        creatorId={post.creator_id}
        reactions={reactions}
        spiritScore={spiritScore}
        positivityRatio={positivityRatio}
        onReact={refreshReactions}
      />
    </div>
  );
}
