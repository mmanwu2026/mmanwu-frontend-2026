// force rebuild 1
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import Link from "next/link";
import ReactionBar from "@/components/vision-square/ReactionBar";
import { useRouter } from "next/navigation";   // ⭐ ADDED

interface ReactionRow {
  maskTier: number;
}

export default function VisionCard({ post }: { post: any }) {
  const supabase = useSupabase();
  const { user } = useUser();
  const router = useRouter();                  // ⭐ ADDED

  // ⭐ Null-safe defaults
  const safeReactions = post.reactions ?? {
    mask1: 0,
    mask2: 0,
    mask3: 0,
    mask4: 0,
    mask5: 0,
    mask6: 0,
  };

  const safeAvatar = post.users?.avatar_url || undefined;
  const safeMedia = typeof post.media_url === "string" ? post.media_url : null;

  const [localMask, setLocalMask] = useState(post.automask ?? 2);
  const [localSpirit, setLocalSpirit] = useState(post.spirit_score ?? 0);
  const [localPositivity, setLocalPositivity] = useState(
    post.positivity_ratio ?? 0.5
  );
  const [localReactions, setLocalReactions] = useState(safeReactions);
  const [localTotalReactions, setLocalTotalReactions] = useState(
    post.total_reactions ?? 0
  );

  useEffect(() => {
    setLocalMask(post.automask ?? 2);
    setLocalSpirit(post.spirit_score ?? 0);
    setLocalPositivity(post.positivity_ratio ?? 0.5);
    setLocalReactions(safeReactions);
    setLocalTotalReactions(post.total_reactions ?? 0);
  }, [post]);

  const [muted, setMuted] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const isVideo =
    safeMedia &&
    (safeMedia.endsWith(".mp4") ||
      safeMedia.endsWith(".webm") ||
      safeMedia.endsWith(".mov"));

  useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) videoRef.current?.play();
          else videoRef.current?.pause();
        });
      },
      { threshold: 0.6 }
    );

    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [isVideo]);

  async function refreshReactions() {
    const { data: reactionRows } = await supabase
      .from("reactions")
      .select('"maskTier"')
      .eq("post_id", post.id)
      .eq("post_type", "vision");

    const rows: ReactionRow[] = reactionRows ?? [];

    const newCounts = {
      mask1: rows.filter((r) => r.maskTier === 1).length,
      mask2: rows.filter((r) => r.maskTier === 2).length,
      mask3: rows.filter((r) => r.maskTier === 3).length,
      mask4: rows.filter((r) => r.maskTier === 4).length,
      mask5: rows.filter((r) => r.maskTier === 5).length,
      mask6: rows.filter((r) => r.maskTier === 6).length,
    };

    setLocalReactions(newCounts);
    setLocalTotalReactions(rows.length);

    const newSpirit = rows.reduce((sum, r) => sum + r.maskTier, 0);
    const positiveCount = rows.filter((r) => r.maskTier >= 3).length;
    const totalCount = rows.length;

    const newPositivity = totalCount > 0 ? positiveCount / totalCount : 0.5;

    let newAutoMask = 2;
    if (newSpirit > 20) newAutoMask = 3;
    if (newSpirit > 100) newAutoMask = 4;
    if (newSpirit > 300) newAutoMask = 5;
    if (newSpirit > 500) newAutoMask = 6;

    setLocalSpirit(newSpirit);
    setLocalPositivity(newPositivity);
    setLocalMask(newAutoMask);

    // ⭐ CRITICAL FIX: Refresh FEED after reaction
    router.refresh();
  }

  const isCreator = user?.id === post.creator_id;
  const isPositive = localMask >= 3;

  return (
    <div
      ref={cardRef}
      data-vision-card
      className="bg-gray-900 rounded-xl p-4 mb-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <Link
          href={`/vision-square/post/${post.id}`}
          className="flex items-center gap-2"
        >
          {safeAvatar && (
            <img
              src={safeAvatar}
              className="w-10 h-10 rounded-full border border-gray-700"
              alt="avatar"
            />
          )}
          <span className="text-purple-200 font-semibold">
            {post.users?.username ?? "unknown"}
          </span>

          {/* ⭐ Creator Badge */}
          {isCreator && (
            <span className="text-xs bg-purple-700 px-2 py-1 rounded text-white">
              Creator
            </span>
          )}

          {/* ⭐ Positive Mask Badge */}
          {isPositive && (
            <span className="text-xs bg-green-700 px-2 py-1 rounded text-white">
              ✨ Uplifting
            </span>
          )}
        </Link>
      </div>

      {post.title && (
        <h2 className="text-xl font-semibold mb-2 text-purple-200">
          {post.title}
        </h2>
      )}

      <div className="mb-4 relative">
        {safeMedia ? (
          isVideo ? (
            <>
              <video
                ref={videoRef}
                src={safeMedia}
                muted={muted}
                playsInline
                className="rounded-lg w-full"
              />
              <button
                onClick={() => setMuted(!muted)}
                className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm"
              >
                {muted ? "🔇" : "🔊"}
              </button>
            </>
          ) : (
            <img src={safeMedia} className="rounded-lg w-full" alt="vision media" />
          )
        ) : null}
      </div>

      <div className="text-gray-300 mb-3 text-sm">
        <p>SpiritScore: {localSpirit}</p>
        <p>Positivity: {Math.round(localPositivity * 100)}%</p>
        <p>Mask: {localMask}</p>
        <p>Reactions: {localTotalReactions}</p>
      </div>

      <ReactionBar
        postType="vision"
        postId={post.id}
        creatorId={post.creator_id}
        reactions={localReactions}
        spiritScore={localSpirit}
        positivityRatio={localPositivity}
        onReact={refreshReactions}   // ⭐ FEED refresh now included
      />

{/* ⭐ COMMENTS SECTION */}
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

      <p className="text-gray-400 text-sm mt-3">
        {post.created_at ? new Date(post.created_at).toLocaleString() : ""}
      </p>
    </div>
  );
}
