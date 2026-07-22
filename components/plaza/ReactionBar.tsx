"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";

interface ReactionCounts {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
}

interface ReactionBarProps {
  postType: "plaza" | "sound" | "vision";
  postId: string;
  creatorId: string;
  reactions: ReactionCounts;
  spiritScore: number;
  positivityRatio: number;
  onReactAction: () => void;
}

export default function ReactionBar({
  postType,
  postId,
  creatorId,
  reactions,
  spiritScore,
  positivityRatio,
  onReactAction,
}: ReactionBarProps) {
  const { supabase } = useSupabase();

  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
      setEmail(user?.email || null);
    }
    loadUser();
  }, [supabase]);

  const [loading, setLoading] = useState(false);

  // ⭐ Load privacy_type depending on postType
  const [privacyType, setPrivacyType] = useState<"public" | "private">("public");

  useEffect(() => {
    async function loadPrivacy() {
      const table =
        postType === "plaza"
          ? "posts"
          : postType === "sound"
          ? "sound_posts"
          : "vision_posts";

      const { data: rows } = await supabase
        .from(table)
        .select("privacy_type")
        .eq("id", postId)
        .limit(1);

      const row = rows?.[0] ?? null;
      if (row?.privacy_type) setPrivacyType(row.privacy_type);
    }

    loadPrivacy();
  }, [postId, postType, supabase]);

  // ⭐ Load follow-state
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);

  useEffect(() => {
    async function loadFollowState() {
      if (!uid || !creatorId) return;

      const { data: rows } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", uid)
        .eq("following_id", creatorId)
        .limit(1);

      setIsFollowing(!!rows?.[0]);
    }

    loadFollowState();
  }, [uid, creatorId, supabase]);

  // ⭐ Privacy enforcement
  const isCreator = uid === creatorId;

  const isAllowed =
    privacyType === "public" ||
    isCreator ||
    isFollowing === true;

  // ⭐ Block reaction UI entirely
  if (!isAllowed) {
    return (
      <div className="mt-2 text-gray-500 text-sm">
        Reactions are private for this post.
      </div>
    );
  }

  async function handleReact(maskTier: number): Promise<void> {
    if (loading || !uid) return;

    setLoading(true);

    const { error } = await supabase.from("reactions").insert({
      post_id: postId,
      post_type: postType,
      user_id: uid,
      maskTier,
      value: maskTier,
    });

    setLoading(false);

    if (error) {
      console.error("apply_reaction error:", error);
      return;
    }

    // Push subscription
    const { data: rows } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", uid)
      .limit(1);

    const sub = rows?.[0] ?? null;

    // Notification
    await fetch("/functions/v1/create-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId: creatorId,
        actorId: uid,
        postId,
        postType,
        message: `${email || "Someone"} reacted to your post`,
        eventType: "reaction",
      }),
    });

    // Push
    if (sub?.subscription) {
      await fetch(
        "https://dnhklmhwbkfhbolskqnt.supabase.co/functions/v1/send-push",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: sub.subscription,
            payload: {
              title: "New Reaction 🎭",
              body: `${email || "Someone"} reacted to your post`,
              icon: "/icons/mman-192.png",
              url: `/post/${postId}`,
            },
          }),
        }
      );
    }

    onReactAction();
  }

  const baseBtn =
    "reaction-mask text-2xl flex flex-col items-center disabled:opacity-40";
  const countClass = "text-[11px] text-gray-600 mt-0.5";

  return (
    <div className="flex items-center justify-center gap-4 mt-2">
      {isCreator && (
        <>
          <button
            onClick={() => handleReact(1)}
            disabled={loading}
            className={baseBtn}
          >
            😶‍🌫️
            <span className={countClass}>{reactions.mask1}</span>
          </button>

          <button
            onClick={() => handleReact(2)}
            disabled={loading}
            className={baseBtn}
          >
            😤
            <span className={countClass}>{reactions.mask2}</span>
          </button>
        </>
      )}

      <button
        onClick={() => handleReact(3)}
        disabled={loading}
        className={baseBtn}
      >
        😊
        <span className={countClass}>{reactions.mask3}</span>
      </button>

      <button
        onClick={() => handleReact(4)}
        disabled={loading}
        className={baseBtn}
      >
        🤩
        <span className={countClass}>{reactions.mask4}</span>
      </button>

      <button
        onClick={() => handleReact(5)}
        disabled={loading}
        className={baseBtn}
      >
        😇
        <span className={countClass}>{reactions.mask5}</span>
      </button>

      <div className="reaction-mask text-2xl flex flex-col items-center opacity-70 cursor-default">
        🔱
        <span className={countClass}>{reactions.mask6}</span>
      </div>
    </div>
  );
}
