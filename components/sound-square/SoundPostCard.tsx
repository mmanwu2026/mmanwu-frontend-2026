"use client";

import { useRef, useState, useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useRouter } from "next/navigation";
import SoundReactionBar from "@/components/sound-square/SoundReactionBar";
import type { ReactionCounts, CardSoundPost } from "@/app/sound-square/types";
import SoundShareButton from "@/components/sound-square/SoundShareButton";

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
  const { supabase } = useSupabase();
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
    }
    loadUser();
  }, [supabase]);

  const isCreator = uid === post.creator_id;

  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);

  useEffect(() => {
    async function loadFollowState() {
      if (!uid || isCreator) {
        setIsFollowing(null);
        return;
      }

      const { data: rows } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", uid)
        .eq("following_id", post.creator_id)
        .limit(1);

      setIsFollowing(!!rows?.[0]);
    }

    loadFollowState();
  }, [uid, post.creator_id, isCreator, supabase]);

  const isAllowed =
    post.privacy_type === "public" ||
    isCreator ||
    isFollowing === true;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<HTMLAudioElement | null>(null);
  const gainRef = useRef<GainNode | null>(null);

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

  const [renderTick, setRenderTick] = useState(0);
  const [isReady, setIsReady] = useState(false);

  if (!isAllowed) {
    return (
      <div className="border border-gray-200 rounded-xl p-6 bg-white">
        <p className="text-gray-500 text-center">
          This sound post is private.
        </p>
      </div>
    );
  }

async function handlePlay() {
  if (!post.audio_url) return;

  const path = post.audio_url.replace(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sound_files/`,
    ""
  );

  const url = `/api/audio?file=${encodeURIComponent(path)}`;

  const audio = new Audio(url);
  audio.crossOrigin = "anonymous";

  if (!audioCtxRef.current) {
    audioCtxRef.current = new AudioContext();
  }

  // ⭐ CRITICAL FIX — resume audio context
  await audioCtxRef.current.resume();

  const ctx = audioCtxRef.current;
  const src = ctx.createMediaElementSource(audio);

  audio.addEventListener("loadedmetadata", () => {
    setDuration(audio.duration);
    setIsReady(true);
  });

  const intensityNode = ctx.createAnalyser();
  intensityNode.fftSize = 256;

  const waveformNode = ctx.createAnalyser();
  waveformNode.fftSize = 2048;

  if (!gainRef.current) {
    gainRef.current = ctx.createGain();
    gainRef.current.gain.value = volume;
  }

  src.connect(intensityNode);
  src.connect(waveformNode);
  src.connect(gainRef.current);
  gainRef.current.connect(ctx.destination);

  setIntensityAnalyser(intensityNode);
  setWaveformAnalyser(waveformNode);

  audio.addEventListener("ended", () => {
    setIsPlaying(false);
    setProgress(0);
    setRenderTick((t) => t + 1);
    setIsReady(false);
  });

  sourceRef.current = audio;
  await audio.play();
  setIsPlaying(true);
}

  function handlePause() {
    const audio = sourceRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }

  useEffect(() => {
    let animationId: number;

    function draw() {
      const canvas = canvasRef.current;
      const intensityNode = intensityAnalyser;
      const waveformNode = waveformAnalyser;

      if (!canvas || !intensityNode || !waveformNode) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const waveformData = new Uint8Array(waveformNode.frequencyBinCount);
      waveformNode.getByteTimeDomainData(waveformData);

      ctx.beginPath();
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;

      const sliceWidth = width / waveformData.length;
      let x = 0;

      for (let i = 0; i < waveformData.length; i++) {
        const v = waveformData[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();

      const intensityData = new Uint8Array(intensityNode.frequencyBinCount);
      intensityNode.getByteFrequencyData(intensityData);
      const avg =
        intensityData.reduce((sum, v) => sum + v, 0) /
        (intensityData.length || 1);

      const normalized = avg / 255;
      setIntensity(normalized);
      setIsBeat(normalized > 0.6);

      if (sourceRef.current) {
        setProgress(sourceRef.current.currentTime);
      }

      animationId = requestAnimationFrame(draw);
    }

    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [intensityAnalyser, waveformAnalyser, renderTick]);

  async function handleDelete() {
    if (!uid || uid !== post.creator_id) return;

    const { error: dbError } = await supabase
      .from("sound_posts")
      .delete()
      .eq("id", post.id)
      .eq("creator_id", uid);

    if (dbError) {
      console.error("Delete error:", dbError);
      return;
    }

    if (post.audio_url) {
      const audioPath = post.audio_url.replace(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sound_files/`,
        ""
      );

      await supabase.storage.from("sound_files").remove([audioPath]);
    }

    post.onDeleted?.(post.id);
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

    setReactions(newCounts);
    setSpiritScore(newSpirit);
    setPositivityRatio(newPositivity);
    setAutoMask(newAutoMask);

    router.refresh();
  };

  async function submitComment() {
    setCommentError("");

    if (!uid) {
      setCommentError("You must be logged in.");
      return;
    }

    if (!isAllowed) {
      setCommentError("This post is private.");
      return;
    }

    if (!newComment.trim()) {
      setCommentError("Comment cannot be empty.");
      return;
    }

    const { error } = await supabase.from("sound_post_comments").insert({
      post_id: post.id,
      user_id: uid,
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
    (post.comments?.length ?? 0) > 0
      ? post.comments![post.comments!.length - 1]
      : null;

return (
  <div className="bg-gray-900 p-4 rounded-lg shadow-lg mb-6">
    <Link href={`/sound-square/post/${post.id}`}>
      <h2 className="text-xl font-bold text-purple-300 hover:text-purple-400 transition">
        {post.title}
      </h2>
    </Link>

    <Link
      href={`/profile/${post.creator_id}`}
      className="text-gray-400 hover:text-gray-200 text-sm"
    >
      @{post.users?.username ?? "Unknown"}
    </Link>

    <div className="flex flex-row items-center justify-between text-xs text-white/70 mt-3 mb-2">
      <div>
        <p className="font-semibold text-white">SpiritScore: {spiritScore}</p>
        <p>Positivity: {Math.round(positivityRatio * 100)}%</p>
        <p>Mask: {autoMask}</p>
      </div>

      <div className="text-right">
        <p>
          Total Reactions:{" "}
          {reactions.mask1 +
            reactions.mask2 +
            reactions.mask3 +
            reactions.mask4 +
            reactions.mask5 +
            reactions.mask6}
        </p>
      </div>
    </div>

    <div className="mt-4">
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

        {/* ⭐ Full-width emoji animation lane */}
        <div className="relative w-full h-10 mt-2">
          <div
            className={`${isBeat ? "mask-bounce" : ""}`}
            style={{
              position: "absolute",
              left: isReady ? `${(progress / duration) * 100}%` : "0%",
              transform: `translateX(-50%) scale(${scale})`,
              transition: isReady ? "left 0.05s linear" : "none",
              whiteSpace: "nowrap",
            }}
          >
            {MASK_EMOJI[autoMask]}
          </div>
        </div>
      </div>

      <div className="text-gray-400 text-sm mt-1">
        {isReady
          ? `${progress.toFixed(1)}s / ${duration.toFixed(1)}s`
          : "Loading…"}
      </div>

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
            if (sourceRef.current && !gainRef.current) {
              sourceRef.current.volume = v;
            }
          }}
          className="w-full"
        />
      </div>

      <canvas ref={canvasRef} className="w-full h-24 mt-3" />
    </div>

    <SoundReactionBar
      postId={post.id}
      creatorId={post.creator_id}
      reactions={reactions}
      onReactAction={refreshReactions}
    />

    {/* ⭐ ADDED: Sound Share Button */}
    <div className="mt-4">
      <SoundShareButton postId={post.id} />
    </div>

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
          View all comments ({post.comments.length})
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

    {uid === post.creator_id && (
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