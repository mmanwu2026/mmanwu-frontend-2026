"use client";

import { useRef, useState, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import SoundReactionBar from "@/components/sound-square/SoundReactionBar";
import type { ReactionCounts, SoundComment, CardSoundPost } from "@/app/sound-square/types";
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const intensityAnalyserRef = useRef<AnalyserNode | null>(null);
  const waveformAnalyserRef = useRef<AnalyserNode | null>(null);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reactions, setReactions] = useState<ReactionCounts>(post.reactions);
  const [spiritScore, setSpiritScore] = useState(post.spirit_score);
  const [positivityRatio, setPositivityRatio] = useState(post.positivity_ratio);
  const [autoMask, setAutoMask] = useState(post.automask);
  const [intensity, setIntensity] = useState(0);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState("");

  /* ---------------------------------------------------------
     ⭐ FETCH SIGNED URL (Fixes Supabase CORS for Web Audio API)
     --------------------------------------------------------- */
  useEffect(() => {
    async function fetchSignedUrl() {
      if (!post.audio_url) return;

      const path = post.audio_url.replace(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sound_files/`,
        ""
      );

      const { data, error } = await supabase.storage
        .from("sound_files")
        .createSignedUrl(path, 60 * 60); // 1 hour

      if (error) {
        console.error("Signed URL error:", error);
        return;
      }

      setSignedUrl(data.signedUrl);
    }

    fetchSignedUrl();
  }, [post.audio_url, supabase]);

  /* ---------------------------------------------------------
     ⭐ Initialize WebAudio AFTER metadata loads
     --------------------------------------------------------- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleReady = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audio);
      }

      if (!intensityAnalyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        sourceRef.current.connect(analyser);
        intensityAnalyserRef.current = analyser;
      }

      if (!waveformAnalyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        sourceRef.current.connect(analyser);
        waveformAnalyserRef.current = analyser;
      }
    };

    audio.addEventListener("loadedmetadata", handleReady);
    audio.addEventListener("canplay", handleReady);

    return () => {
      audio.removeEventListener("loadedmetadata", handleReady);
      audio.removeEventListener("canplay", handleReady);
    };
  }, []);

  /* ---------------------------------------------------------
     ⭐ Intensity Analyzer Loop
     --------------------------------------------------------- */
  useEffect(() => {
    const analyser = intensityAnalyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let frame: number;

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((s, v) => s + v, 0) / bufferLength;
      const normalized = Math.min(avg / 180, 1);
      setIntensity(normalized);

      if (normalized > 0.75 && autoMask < 6) {
        setAutoMask((prev) => Math.min(prev + 1, 6));
      }

      frame = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(frame);
  }, [autoMask]);

  /* ---------------------------------------------------------
     ⭐ Waveform Visualizer Loop
     --------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const analyser = waveformAnalyserRef.current;
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
    };
  }, []);

  function handlePlay() {
    audioCtxRef.current?.resume();
    audioRef.current?.play();
    setIsPlaying(true);
  }

  function handlePause() {
    audioRef.current?.pause();
    setIsPlaying(false);
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

  {/* Debug logs — OUTSIDE JSX */}
  {(() => {
    console.log("RAW audio_url:", post.audio_url);
    console.log(
      "EXTRACTED path:",
      post.audio_url.replace(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sound_files/`,
        ""
      )
    );
    return null; // prevents ReactNode error
  })()}

  <audio
    ref={audioRef}
    src={`/api/audio?file=${encodeURIComponent(
      post.audio_url.replace(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sound_files/`,
        ""
      )
    )}`}
    preload="metadata"
  />

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

    <span className="text-purple-300 text-lg" style={{ transform: `scale(${scale})` }}>
      {MASK_EMOJI[autoMask]}
    </span>
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
            <span className="font-semibold">@{latestComment.profiles?.username ?? "Unknown"}:</span>{" "}
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
                  <span className="font-semibold">@{c.profiles?.username ?? "Unknown"}:</span>{" "}
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

            {commentError && <p className="text-red-400 mb-2">{commentError}</p>}

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
