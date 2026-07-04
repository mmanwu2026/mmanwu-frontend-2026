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

  const [isPlaying, setIsPlaying] = useState(false);
  const [reactions, setReactions] = useState<ReactionCounts>(post.reactions);
  const [spiritScore, setSpiritScore] = useState(post.spirit_score);
  const [positivityRatio, setPositivityRatio] = useState(post.positivity_ratio);
  const [autoMask, setAutoMask] = useState(post.automask);
  const [intensity, setIntensity] = useState(0);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

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
      analyser.connect(ctx.destination);
      intensityAnalyserRef.current = analyser;
    }

    if (!waveformAnalyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      sourceRef.current.connect(analyser);
      waveformAnalyserRef.current = analyser;
    }
  }, []);

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

  return (
    <div
      className={`
        bg-gray-800 p-6 rounded-lg shadow-lg transition-all
        ${isTrending ? "shadow-[0_0_25px_rgba(168,85,247,0.7)] border border-purple-500 animate-pulse" : ""}
      `}
    >
      {user?.id === post.creator_id && (
        <button
          onClick={handleDelete}
          className="text-red-400 hover:text-red-300 text-sm mb-3"
        >
          Delete Post
        </button>
      )}

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

      {post.comments && post.comments.length > 0 && (
        <div className="mt-4">
          <p className="text-gray-300 text-sm font-medium mb-2">
            💬 {post.comment_count} comments
          </p>

          {post.comments.slice(0, 2).map((comment) => (
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

      <div className="flex gap-4 mt-4">
        <button
          onClick={() => setShowCommentsModal(true)}
          className="text-purple-300 hover:text-purple-200 text-sm"
        >
          💬 Comment
        </button>

        <button
          onClick={() => setShowShareModal(true)}
          className="text-purple-300 hover:text-purple-200 text-sm"
        >
          🔗 Share
        </button>
      </div>

      <SoundReactionBar
        postId={post.id}
        creatorId={post.creator_id}
        reactions={reactions}
        onReact={refreshReactions}
      />

      {showCommentsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9000] flex items-center justify-center p-4">
          <div className="bg-gray-900 p-6 rounded-xl max-w-lg w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4">Comments</h2>

            {post.comments.map((comment) => (
              <div key={comment.id} className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src={comment.profiles?.avatar_url || "/default-avatar.png"}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-purple-200 font-semibold">
                    {comment.profiles?.username || "unknown"}
                  </span>
                </div>
                <p className="text-gray-300 text-sm ml-8">{comment.content}</p>
              </div>
            ))}

            <textarea
              className="w-full bg-gray-800 text-white rounded p-2 mt-4"
              placeholder="Write a comment…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />

            {commentError && (
              <p className="text-red-400 text-sm mt-1">{commentError}</p>
            )}

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowCommentsModal(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                Close
              </button>

              <button
                onClick={submitComment}
                className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
              >
                Post Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9000] flex items-center justify-center p-4">
          <div className="bg-gray-900 p-6 rounded-xl max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4">Share this Sound</h2>

            <p className="text-gray-300 mb-4">
              Copy the link below to share this sound:
            </p>

            <input
              type="text"
              readOnly
              value={`${window.location.origin}/sound-square/post/${post.id}`}
              className="w-full bg-gray-800 text-white p-2 rounded"
            />

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                Close
              </button>

              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${window.location.origin}/sound-square/post/${post.id}`
                  )
                }
                className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
