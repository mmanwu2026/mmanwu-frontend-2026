"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useRouter } from "next/navigation";

interface ReactionCounts {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
}

export default function SoundReactionBar({
  postId,
  creatorId,
  reactions,
  onReactAction,
}: {
  postId: string;
  creatorId: string;
  reactions: ReactionCounts;
  onReactAction: () => void;
}) {
  const { supabase } = useSupabase();
  const router = useRouter();

  // Auth
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

  // Load privacy_type
  const [privacyType, setPrivacyType] = useState<"public" | "private">("public");

  useEffect(() => {
    async function loadPrivacy() {
      const { data: rows } = await supabase
        .from("sound_posts")
        .select("privacy_type")
        .eq("id", postId)
        .limit(1);

      const row = rows?.[0] ?? null;
      if (row?.privacy_type) setPrivacyType(row.privacy_type);
    }

    loadPrivacy();
  }, [postId, supabase]);

  // Load follow-state
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

  // Privacy enforcement
  const isCreator = uid === creatorId;

  const isAllowed =
    privacyType === "public" ||
    isCreator ||
    isFollowing === true;

  // Block reaction UI entirely
  if (!isAllowed) {
    return (
      <div className="mt-4 text-gray-500 text-sm">
        Reactions are private for this sound.
      </div>
    );
  }

  async function handleReact(maskTier: number) {
    if (!uid || loading) return;

    setLoading(true);

    // Save reaction
    const { error } = await supabase.from("reactions").insert({
      post_id: postId,
      post_type: "sound",
      user_id: uid,
      maskTier,
      value: maskTier,
    });

    setLoading(false);

    if (error) {
      console.error("sound_reaction error:", error);
      return;
    }

    // Fetch push subscription
    const { data: rows } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", uid)
      .limit(1);

    const sub = rows?.[0] ?? null;

    // Insert notification
    await fetch("/functions/v1/create-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId: creatorId,
        actorId: uid,
        postId,
        postType: "sound",
        message: `${email || "Someone"} reacted to your sound`,
        eventType: "reaction",
      }),
    });

    // Push notification
    if (sub?.subscription) {
      await fetch(
        "https://dnhklmhwbkfhbolskqnt.supabase.co/functions/v1/send-push",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: sub.subscription,
            payload: {
              title: "New Reaction 🔊",
              body: `${email || "Someone"} reacted to your sound`,
              icon: "/icons/mman-192.png",
              url: `/sound/${postId}`,
            },
          }),
        }
      );
    }

    router.refresh();
    onReactAction();
  }

  return (
    <div className="flex gap-6 mt-4 items-center">

      {isCreator && (
        <>
          <button
            onClick={() => handleReact(1)}
            disabled={loading}
            className="text-3xl flex flex-col items-center hover:scale-110 transition disabled:opacity-40"
          >
            😶‍🌫️
            <span className="text-xs text-gray-400">{reactions.mask1}</span>
          </button>

          <button
            onClick={() => handleReact(2)}
            disabled={loading}
            className="text-3xl flex flex-col items-center hover:scale-110 transition disabled:opacity-40"
          >
            😤
            <span className="text-xs text-gray-400">{reactions.mask2}</span>
          </button>
        </>
      )}

      <button
        onClick={() => handleReact(3)}
        disabled={loading}
        className="text-3xl flex flex-col items-center hover:scale-110 transition disabled:opacity-40"
      >
        😊
        <span className="text-xs text-gray-400">{reactions.mask3}</span>
      </button>

      <button
        onClick={() => handleReact(4)}
        disabled={loading}
        className="text-3xl flex flex-col items-center hover:scale-110 transition disabled:opacity-40"
      >
        🤩
        <span className="text-xs text-gray-400">{reactions.mask4}</span>
      </button>

      <button
        onClick={() => handleReact(5)}
        disabled={loading}
        className="text-3xl flex flex-col items-center hover:scale-110 transition disabled:opacity-40"
      >
        😇
        <span className="text-xs text-gray-400">{reactions.mask5}</span>
      </button>

      <button
        onClick={() => handleReact(6)}
        disabled={loading}
        className="text-3xl flex flex-col items-center hover:scale-110 transition disabled:opacity-40"
      >
        🔱
        <span className="text-xs text-gray-400">{reactions.mask6}</span>
      </button>
    </div>
  );
}
