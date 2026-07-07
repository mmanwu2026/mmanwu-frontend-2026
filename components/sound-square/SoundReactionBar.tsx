"use client";

import { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
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
  onReact,
}: {
  postId: string;
  creatorId: string;
  reactions: ReactionCounts;
  onReact: () => void;
}) {
  const { supabase } = useSupabase();
  const { user } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const isCreator = user?.id === creatorId;

  async function handleReact(maskTier: number) {
    if (!user || loading) return;

    setLoading(true);

    // 1. Save reaction
    const { error } = await supabase.from("reactions").insert({
      post_id: postId,
      post_type: "sound",
      user_id: user.id,
      maskTier,
      value: maskTier,
    });

    setLoading(false);

    if (error) {
      console.error("sound_reaction error:", error);
      return;
    }

   // 2. Fetch creator's push subscription
const { data: sub } = await supabase
  .from("push_subscriptions")
  .select("subscription")
  .eq("user_id", creatorId)
  .single();

// ⭐ Insert notification into database
await supabase.from("notifications").insert({
  user_id: creatorId,
  actor_id: user.id,
  event_type: "reaction",
  post_id: postId,
  post_type: "sound",
  message: `${user.email || "Someone"} reacted to your sound`,
});

// 3. Trigger push notification
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
              body: `${user.email || "Someone"} reacted to your sound`,
              icon: "/icons/mman-192.png",
              url: `/sound/${postId}`,
            },
          }),
        }
      );
    }

    // 4. Refresh UI
    router.refresh();
    onReact();
  }

  return (
    <div className="flex gap-6 mt-4 items-center">

      {isCreator && (
        <>
          <button
            onClick={() => handleReact(1)}
            className="text-3xl flex flex-col items-center hover:scale-110 transition"
          >
            😶‍🌫️
            <span className="text-xs text-gray-400">{reactions.mask1}</span>
          </button>

          <button
            onClick={() => handleReact(2)}
            className="text-3xl flex flex-col items-center hover:scale-110 transition"
          >
            😈
            <span className="text-xs text-gray-400">{reactions.mask2}</span>
          </button>
        </>
      )}

      <button
        onClick={() => handleReact(3)}
        className="text-3xl flex flex-col items-center hover:scale-110 transition"
      >
        😊
        <span className="text-xs text-gray-400">{reactions.mask3}</span>
      </button>

      <button
        onClick={() => handleReact(4)}
        className="text-3xl flex flex-col items-center hover:scale-110 transition"
      >
        🤩
        <span className="text-xs text-gray-400">{reactions.mask4}</span>
      </button>

      <button
        onClick={() => handleReact(5)}
        className="text-3xl flex flex-col items-center hover:scale-110 transition"
      >
        😇
        <span className="text-xs text-gray-400">{reactions.mask5}</span>
      </button>

      <button
        onClick={() => handleReact(6)}
        className="text-3xl flex flex-col items-center hover:scale-110 transition"
      >
        🔱
        <span className="text-xs text-gray-400">{reactions.mask6}</span>
      </button>
    </div>
  );
}
