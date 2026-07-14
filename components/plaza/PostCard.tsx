"use client";

import { useSupabase } from "@/app/context/SupabaseContext";
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

  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUid(session.data.session?.user?.id || null);
    }
    loadUser();
  }, [supabase]);

  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const isOwnPost = uid === post.creator_id;

  useEffect(() => {
    async function loadFollowState() {
      if (!uid || isOwnPost) {
        setIsFollowing(null);
        return;
      }

      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", uid)
        .eq("following_id", post.creator_id)
        .maybeSingle();

      setIsFollowing(!!data);
    }

    loadFollowState();
  }, [uid, post.creator_id, supabase, isOwnPost]);

  async function toggleFollow() {
    if (!uid || isOwnPost || busy) return;

    setBusy(true);

    try {
      if (!isFollowing) {
        await supabase.from("follows").insert({
          follower_id: uid,
          following_id: post.creator_id,
        });
        setIsFollowing(true);
      } else {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", uid)
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
      <div className="plaza-card-base clean p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-3">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
              {post.autoMask === 2 && "😤"}
              {post.autoMask === 3 && "😊"}
              {post.autoMask === 4 && "🤩"}
              {post.autoMask === 5 && "😇"}
              {post.autoMask === 6 && "🔱"}
            </div>

            <div className="flex flex-col">
              <span className="text-gray-900 text-sm font-semibold">
                {post.creator_id}
              </span>
              <span className="text-gray-500 text-xs">
                Spirit Score: {spiritScore}
              </span>
            </div>
          </div>

          {/* FOLLOW BUTTON */}
          {!isOwnPost && isFollowing !== null && (
            <button
              onClick={toggleFollow}
              disabled={busy}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                isFollowing
                  ? "bg-gray-200 text-gray-900 border-gray-300 hover:bg-gray-300"
                  : "bg-blue-600 text-white border-blue-600 hover:bg-blue-500"
              } ${busy ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* CONTENT */}
        <p className="text-gray-900 whitespace-pre-wrap mb-4">
          {post.content}
        </p>

        {/* REACTIONS */}
        <ReactionBar
          postType="plaza"
          postId={post.id}
          creatorId={post.creator_id}
          reactions={reactions}
          spiritScore={spiritScore}
          positivityRatio={positivityRatio}
          onReact={onReact}
        />

        {/* DELETE BUTTON */}
        {showDelete && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onDelete?.(post.id)}
              className="text-red-600 text-xs hover:text-red-500 transition"
            >
              Delete
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
