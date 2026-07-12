"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";

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
  onReact: () => void;
}

export default function ReactionBar({
  postType,
  postId,
  creatorId,
  reactions,
  spiritScore,
  positivityRatio,
  onReact,
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

  const loggedOut = !uid;
  const isCreator = uid === creatorId;

  const handleReact = async (maskTier: number): Promise<void> => {
    if (loading || loggedOut || !uid) return;

    setLoading(true);

    const { error } = await supabase.from("reactions").insert({
      post_id: postId,
      post_type: postType,
      user_id: uid,
      maskTier,
    });

    setLoading(false);

    if (error) {
      console.error("apply_reaction error:", error);
      return;
    }

    const { data: sub } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", uid)
      .single();

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

    onReact();
  };

  const baseBtn =
    "reaction-mask text-2xl flex flex-col items-center disabled:opacity-40";

  const countClass = "text-[11px] text-gray-600 mt-0.5";

  return (
    <div className="flex items-center justify-center gap-4 mt-2">
      {isCreator && (
        <button
          onClick={() => handleReact(1)}
          disabled={loggedOut || loading}
          className={baseBtn}
        >
          😶‍🌫️
          <span className={countClass}>{reactions.mask1}</span>
        </button>
      )}

      {isCreator && (
        <button
          onClick={() => handleReact(2)}
          disabled={loggedOut || loading}
          className={baseBtn}
        >
          😤
          <span className={countClass}>{reactions.mask2}</span>
        </button>
      )}

      <button
        onClick={() => handleReact(3)}
        disabled={loggedOut || loading}
        className={baseBtn}
      >
        😊
        <span className={countClass}>{reactions.mask3}</span>
      </button>

      <button
        onClick={() => handleReact(4)}
        disabled={loggedOut || loading}
        className={baseBtn}
      >
        🤩
        <span className={countClass}>{reactions.mask4}</span>
      </button>

      <button
        onClick={() => handleReact(5)}
        disabled={loggedOut || loading}
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
