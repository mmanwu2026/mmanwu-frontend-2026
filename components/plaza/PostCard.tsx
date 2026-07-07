"use client";

import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import { useState, useEffect } from "react";
import ReactionBar from "./ReactionBar";

interface PostCardProps {
  post: {
    id: string;
    creator_id: string;
    content: string;
    created_at: string;
    spirit_score: number;
    autoMask: number;
  };
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
    mask6: number;
  };
  positivityRatio: number;
  onReact: () => void;

  // ⭐ DELETE SUPPORT
  showDelete?: boolean;
  onDelete?: (postId: string) => void;
}

export default function PostCard({
  post,
  reactions,
  positivityRatio,
  onReact,
  showDelete = false,
  onDelete,
}: PostCardProps) {

  const { supabase } = useSupabase();
  const { user } = useUser();

  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const isOwnPost = user?.id === post.creator_id;

  // Load follow state
  useEffect(() => {
    async function loadFollowState() {
      if (!user || isOwnPost) {
        setIsFollowing(null);
        return;
      }

      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", post.creator_id)
        .maybeSingle();

      setIsFollowing(!!data);
    }

    loadFollowState();
  }, [user, post.creator_id, supabase, isOwnPost]);

  // Follow/unfollow
  async function toggleFollow() {
    if (!user || isOwnPost || busy) return;

    setBusy(true);

    try {
      if (!isFollowing) {
        await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: post.creator_id,
        });
        setIsFollowing(true);
      } else {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", post.creator_id);

        setIsFollowing(false);
      }
    } finally {
      setBusy(false);
    }
  }

  const spiritScore = post.spirit_score;

  const intensity =
    positivityRatio > 0.7 ? "high" :
    positivityRatio < 0.4 ? "low" :
    "mid";

  return (
    <div
      className={`
        aura-mask-${post.autoMask}
        aura-intensity-${intensity}
        relative w-full rounded-2xl transition-all duration-500
      `}
    >
      {/* ⭐ REQUIRED WRAPPER FOR GLOW ENGINE */}
      <div className="plaza-card-base p-5 rounded-2xl relative">

        {/* ⭐ HEADER */}
        <div className="flex items-center justify-between mb-3">

          {/* LEFT SIDE — Avatar + Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
              {post.autoMask === 2 && "😤"}
              {post.autoMask === 3 && "😊"}
              {post.autoMask === 4 && "🤩"}
              {post.autoMask === 5 && "😇"}
              {post.autoMask === 6 && "🔱"}
            </div>

            <div className="flex flex-col">
              <span className="text-white/90 text-sm font-semibold">
                {post.creator_id}
              </span>
              <span className="text-white/40 text-xs">
                Spirit Score: {spiritScore}
              </span>
            </div>
          </div>

          {/* RIGHT SIDE — Follow button */}
          {!isOwnPost && isFollowing !== null && (
            <button
              onClick={toggleFollow}
              disabled={busy}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                isFollowing
                  ? "bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700"
                  : "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
              } ${busy ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* ⭐ CONTENT */}
        <p className="text-white/90 whitespace-pre-wrap mb-4">
          {post.content}
        </p>

        {/* ⭐ REACTIONS */}
        <ReactionBar
          postType="plaza"
          postId={post.id}
          creatorId={post.creator_id}
          reactions={reactions}
          spiritScore={spiritScore}
          positivityRatio={positivityRatio}
          onReact={onReact}
        />

        {/* ⭐ DELETE BUTTON — bottom-right, stable */}
        {showDelete && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onDelete?.(post.id)}
              className="text-red-400 text-xs hover:text-red-300 transition"
            >
              Delete
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
