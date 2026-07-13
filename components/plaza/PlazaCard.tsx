"use client";

import React, { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSupabase } from "@/app/context/SupabaseContext";
import ReactionBar from "@/components/plaza/ReactionBar";
import PlazaComments from "@/components/plaza/PlazaComments";

interface ReactionCounts {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
}

interface CreatorProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface PlazaPost {
  id: string;
  creator_id: string;
  content: string;
  created_at: string;
  spirit_score: number;
  positivity_ratio: number;
  autoMask: number;
  reactions: ReactionCounts;
}

export default function PlazaCard({
  post,
  creator,
  userId,
  onDeleteAction,
  onReactAction,
}: {
  post: PlazaPost;
  creator: CreatorProfile;
  userId: string;
  onDeleteAction: (id: string) => void;
  onReactAction: () => void;
}) {
  const { supabase } = useSupabase();
  const isCreator = userId === post.creator_id;

  const FALLBACK_AVATAR =
    "https://dnhklmhwbkfhbolskqnt.supabase.co/storage/v1/object/public/avatars/avatar-fallback-256.png";

  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFollowState() {
      if (!userId || isCreator) {
        if (active) setIsFollowing(null);
        return;
      }

      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", userId)
        .eq("following_id", post.creator_id)
        .maybeSingle();

      if (active) setIsFollowing(!!data);
    }

    loadFollowState();
    return () => {
      active = false;
    };
  }, [userId, post.creator_id, isCreator, supabase]);

  async function toggleFollow() {
    if (!userId || isCreator || busy) return;

    setBusy(true);

    try {
      if (!isFollowing) {
        await supabase.from("follows").insert({
          follower_id: userId,
          following_id: post.creator_id,
        });
        setIsFollowing(true);
      } else {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", post.creator_id);

        setIsFollowing(false);
      }
    } finally {
      setBusy(false);
    }
  }

  function auraIntensity(score: number, positivity: number) {
    let level =
      score < 6 ? 0 :
      score < 16 ? 1 :
      score < 31 ? 2 :
      score < 51 ? 3 :
      4;

    if (positivity > 0.6) level++;
    if (positivity < 0.3) level--;

    return Math.max(0, Math.min(4, level));
  }

  const glyphEmoji =
    post.autoMask === 1 ? "😶‍🌫️" :
    post.autoMask === 2 ? "😤" :
    post.autoMask === 3 ? "😊" :
    post.autoMask === 4 ? "🤩" :
    post.autoMask === 5 ? "😇" :
    post.autoMask === 6 ? "🔱" :
    "😤";

  const intensity = auraIntensity(post.spirit_score, post.positivity_ratio);

  const totalReactions =
    post.reactions.mask1 +
    post.reactions.mask2 +
    post.reactions.mask3 +
    post.reactions.mask4 +
    post.reactions.mask5 +
    post.reactions.mask6;

  const trendingScore = post.spirit_score + totalReactions * 5;
  const isTrending = trendingScore > 100;

  const floatY = Math.max(-20 - post.spirit_score * 0.25, -90);

  return (
    <div className="relative isolate z-0 transition-all duration-500 w-full">
      <div
        className={`aura-mask-${post.autoMask} aura-intensity-${intensity} rounded-2xl`}
      >
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm w-full flex flex-col p-6">
          {/* IDENTITY HEADER */}
          <div className="flex items-center justify-between mb-3">
            <Link
              href={`/profile/${creator.id}`}
              className="flex items-center gap-2 hover:opacity-80 transition"
            >
              <img
                src={creator?.avatar_url || FALLBACK_AVATAR}
                className="plaza-avatar border border-gray-300"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  {creator?.username || "unknown"}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(post.created_at).toLocaleString()}
                </span>
              </div>
            </Link>

            {!isCreator && isFollowing !== null && (
              <button
                onClick={toggleFollow}
                disabled={busy}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  isFollowing
                    ? "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"
                    : "bg-blue-600 text-white border-blue-600 hover:bg-blue-500"
                } ${busy ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>

          {/* GLYPH */}
          <div className="mt-4 flex justify-center">
            <div className="ritual-glyph-container">
              <div className="ritual-glyph-levitate">
                <div className="ritual-flame-ring clean"></div>
                <div className="ritual-shadow-floor clean"></div>
                <div
                  className="emoji-glyph clean"
                  style={{ "--float-y": `${floatY}px` } as CSSProperties}
                >
                  {glyphEmoji}
                </div>
              </div>
            </div>
          </div>

          {isTrending && (
            <p className="mt-2 text-xs text-amber-600 text-center">
              Trending • Score {trendingScore}
            </p>
          )}

          {/* CONTENT */}
          <p className="whitespace-pre-line text-base leading-relaxed text-gray-900 text-center mt-4 px-4 max-h-[200px] overflow-y-auto">
            {post.content}
          </p>

          {/* FOOTER */}
          <div className="mt-4 w-full border-t border-gray-200 pt-3">
            <p className="text-xs text-gray-600 text-center">
              SpiritScore: {post.spirit_score} • Reactions: {totalReactions} • Mask: {post.autoMask}
            </p>

            {isCreator && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => onDeleteAction(post.id)}
                  className="px-3 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            )}

            <div className="mt-4 w-full flex justify-center">
              <ReactionBar
                postType="plaza"
                postId={post.id}
                creatorId={post.creator_id}
                reactions={post.reactions}
                spiritScore={post.spirit_score}
                positivityRatio={post.positivity_ratio}
                onReact={onReactAction}
              />
            </div>

            <PlazaComments
              postId={post.id}
              postCreatorId={post.creator_id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
