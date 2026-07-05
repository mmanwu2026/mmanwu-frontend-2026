"use client";

import { useRef, useState, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import SoundReactionBar from "@/components/sound-square/SoundReactionBar";
import type { ReactionCounts, CardSoundPost } from "@/app/sound-square/types";
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
  post: CardSoundPost & { onDeleted?: (id: string) => void };
  isTrending?: boolean;
}) {
  const supabase = useSupabase();
  const { user } = useUser();
  const router = useRouter();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // ⭐ NEW: analysers stored in state (NOT refs)
  const [intensityAnalyser, setIntensityAnalyser] = useState<AnalyserNode | null>(null);
  const [waveformAnalyser, setWaveformAnalyser] = useState<AnalyserNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [reactions, setReactions] = useState<ReactionCounts>(post.reactions);
  const [spiritScore, setSpiritScore] = useState(post.spirit_score);
  const [positivityRatio, setPositivityRatio] = useState(post.positivity_ratio);
  const [autoMask, setAutoMask] = useState(post.automask);
  const [intensity, setIntensity] = useState(0);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState("");

  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBeat, setIsBeat] = useState(false);

  // ⭐ NEW: Render Tick — forces React to re-render every frame
  const [renderTick, setRenderTick] = useState(0);

  /* ---------------------------------------------------------
     ⭐ Intensity Analyzer Loop (with beat detection + render tick)
     --------------------------------------------------------- */
  useEffect(() => {
    const analyser = intensityAnalyser;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let frame: number;

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((s, v) => s + v, 0) / bufferLength;
      const normalized = Math.min(avg / 180, 1);
      setIntensity(normalized);

      // Beat detection
      if (normalized > 0.65) {
        setIsBeat(true);
        setTimeout(() => setIsBeat(false), 100);
      }

      // Force React to re-render
      setRenderTick((t) => t + 1);

      if (normalized > 0.75 && autoMask < 6) {
        setAutoMask((prev) => Math.min(prev + 1, 6));
      }

      frame = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(frame);
  }, [intensityAnalyser, autoMask]);

  /* ---------------------------------------------------------
     ⭐ Waveform Visualizer Loop (beat-reactive)
     --------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const analyser = waveformAnalyser;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    let frame: number;

    const draw = () => {
      frame = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = isBeat ? 3 : 2;
      ctx.strokeStyle = isBeat ? "#d8b4fe" : "#9b5cf6";
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
    };
  }, [waveformAnalyser, isBeat]);

  /* ---------------------------------------------------------
     ⭐ Playback Progress Loop
     --------------------------------------------------------- */
  useEffect(() => {
    let frame: number;

    const tick = () => {
      if (audioCtxRef.current && isPlaying) {
        const ctx = audioCtxRef.current;
        const elapsed = ctx.currentTime;
        setProgress(Math.min(elapsed, duration));
      }
      frame = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(frame);
  }, [duration, isPlaying]);

  /* ---------------------------------------------------------
     ⭐ NEW: ArrayBuffer + AudioBufferSourceNode Playback
     --------------------------------------------------------- */
  async function handlePlay() {
    try {
      const path = post.audio_url.replace(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sound_files/`,
        ""
      );

      const url = `${process.env.NEXT_PUBLIC_SITE_URL}/api/audio?file=${encodeURIComponent(
        path
      )}`;

      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      setDuration(audioBuffer.duration);
      setProgress(0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      if (!gainRef.current) {
        gainRef.current = ctx.createGain();
        gainRef.current.gain.value = volume;
      }

      // Create analysers
      const intensityNode = ctx.createAnalyser();
      intensityNode.fftSize = 256;

      const waveformNode = ctx.createAnalyser();
      waveformNode.fftSize = 2048;

      // Save analysers in state (critical fix)
      setIntensityAnalyser(intensityNode);
      setWaveformAnalyser(waveformNode);

      // Connect nodes
      source.connect(intensityNode);
      source.connect(waveformNode);
      source.connect(gainRef.current);
      gainRef.current.connect(ctx.destination);

      source.start(0);
      sourceRef.current = source;

      setIsPlaying(true);
    } catch (err) {
      console.error("Audio play error:", err);
    }
  }

  function handlePause() {
    try {
      sourceRef.current?.stop();
      setIsPlaying(false);
    } catch (err) {
      console.error("Pause error:", err);
    }
  }

  /* ---------------------------------------------------------
     ⭐ Delete Post
     --------------------------------------------------------- */
  async function handleDelete() {
    if (!user || user.id !== post.creator_id) return;

    const { error: dbError } = await supabase
      .from("sound_posts")
      .delete()
      .eq("id", post.id)
      .eq("creator_id", user.id);

    if (dbError) {
      console.error("Delete error:", dbError);
      return;
    }

    const audioPath = post.audio_url.replace(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sound_files/`,
      ""
    );

    await supabase.storage.from("sound_files").remove([audioPath]);

    if (typeof post.onDeleted === "function") {
      post.onDeleted(post.id);
    }

    router.refresh();
  }

  /* ---------------------------------------------------------
     ⭐ Refresh Reactions
     --------------------------------------------------------- */
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

    const newPositivity = totalCount > 0 ? positiveCount / totalCount : 0.5;

    let newAutoMask = 2;
    if (newSpirit > 20) newAutoMask = 3;
    if (newSpirit > 100) newAutoMask = 4;
    if (newSpirit > 300) newAutoMask = 5;
    if (newSpirit > 500) newAutoMask = 6;

    if (intensity > 0.75 && newAutoMask < 6) {
      newAutoMask += 1;
    }

    setReactions(newCounts);
    setSpiritScore(newSpirit);
    setPositivityRatio(newPositivity);
    setAutoMask(newAutoMask);

    router.refresh();
  };

  /* ---------------------------------------------------------
     ⭐ Submit Comment
     --------------------------------------------------------- */
  async function submitComment() {
    setCommentError("");

    if (!user) {
      setCommentError("You must be logged in.");
      return;
    }

    if (!newComment.trim()) {
      setCommentError("Comment cannot be empty.");
      return;
    }

    const { error } = await supabase.from("sound_post_comments").insert({
      post_id: post.id,
      user_id: user.id,
      content: newComment.trim(),
      raw_input: newComment.trim(),
      automask: 2,
      positivity_ratio: 0.5,
    });

    if (error) {
      console.error(error);
      setCommentError("Failed to post comment.");
      return;
    }

    setNewComment("");
    router.refresh();
  }

  const scale = 1 + intensity * 0.2;

  const latestComment =
    post.comments.length > 0 ? post.comments[post.comments.length - 1] : null;

  /* ---------------------------------------------------------
     ⭐ RENDER
     --------------------------------------------------------- */
  return (
    <div className="bg-gray-900 p-4 rounded-lg shadow-lg mb-6">
      {/* Title → Post Detail */}
      <Link href={`/sound-square/post/${post.id}`}>
        <h2 className="text-xl font-bold text-purple-300 hover:text-purple-400 transition">
          {post.title}
        </h2>
      </Link>

      {/* Creator → Profile */}
      <Link
        href={`/profile/${post.creator_id}`}
        className="text-gray-400 hover:text-gray-200 text-sm"
      >
        @{post.users?.username ?? "Unknown"}
      </Link>

      {/* Audio Player */}
      <div className="mt-4">
        {/* Debug logs */}
        {(() => {
          const extractedPath = post.audio_url.replace(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sound_files/`,
            ""
          );
          console.log("RAW audio_url:", post.audio_url);
          console.log("EXTRACTED path:", extractedPath);
          return null;
        })()}

        <div className="flex items-center gap-3 mt-2">
          {!isPlaying ? (
            <button
              onClick={handlePlay}
              className="bg-purple-600 px-3 py-1 rounded hover:bg-purple-500"
            >
              Play
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
            >
              Pause
            </button>
          )}

<span
  className={`text-purple-300 text-lg no-levitate mask-base mask-glow ${isBeat ? "beat-active beat-glow" : ""}`}
  style={{ transform: `scale(${scale})` }}
>
  {MASK_EMOJI[autoMask]}
</span>

        </div>

        {/* Playback progress + duration */}
        <div className="text-gray-400 text-sm mt-1">
          {progress.toFixed(1)}s / {duration.toFixed(1)}s
        </div>

        {/* Volume control */}
        <div className="mt-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (gainRef.current) gainRef.current.gain.value = v;
            }}
            className="w-full"
          />
        </div>

        {/* Waveform */}
        <canvas ref={canvasRef} className="w-full h-24 mt-3" />
      </div>

      {/* Reaction Bar */}
      <SoundReactionBar
        postId={post.id}
        creatorId={post.creator_id}
        reactions={reactions}
        onReact={refreshReactions}
      />

      {/* ⭐ Inline Latest Comment */}
      {latestComment && (
        <div className="mt-4 bg-gray-800 p-3 rounded">
          <p className="text-sm text-gray-300">
            <span className="font-semibold">
              @{latestComment.profiles?.username ?? "Unknown"}:
            </span>{" "}
            {latestComment.content}
          </p>

          <button
            onClick={() => setShowCommentsModal(true)}
            className="text-purple-400 hover:text-purple-300 text-sm mt-2"
          >
            View all comments ({post.comment_count})
          </button>
        </div>
      )}

      {!latestComment && (
        <button
          onClick={() => setShowCommentsModal(true)}
          className="text-gray-300 hover:text-gray-100 mt-4"
        >
          No comments yet — add one
        </button>
      )}

      {/* ⭐ Full Comments Modal */}
      {showCommentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Comments</h3>

            {post.comments.map((c) => (
              <div key={c.id} className="mb-3">
                <p className="text-gray-300 text-sm">
                  <span className="font-semibold">
                    @{c.profiles?.username ?? "Unknown"}:
                  </span>{" "}
                  {c.content}
                </p>
              </div>
            ))}

            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 mb-2"
              placeholder="Write a comment..."
            />

            {commentError && (
              <p className="text-red-400 mb-2">{commentError}</p>
            )}

            <button
              onClick={submitComment}
              className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
            >
              Submit
            </button>

            <button
              onClick={() => setShowCommentsModal(false)}
              className="mt-4 text-gray-400 hover:text-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete (creator only) */}
      {user?.id === post.creator_id && (
        <button
          onClick={handleDelete}
          className="mt-4 text-red-400 hover:text-red-300"
        >
          Delete Post
        </button>
      )}
    </div>
  );
}
