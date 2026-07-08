"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import SpiritToast from "@/components/SpiritToast";
import { useRouter } from "next/navigation";

interface ReactionCounts {
  mask1: number;
  mask2: number;
  mask3: number;
  mask4: number;
  mask5: number;
  mask6: number;
}

interface VisionReactionBarProps {
  postType: "vision";
  postId: string;
  creatorId: string;
  reactions: ReactionCounts;
  spiritScore: number;
  positivityRatio: number;
  onReact: () => void;
}

export default function ReactionBar({
  postId,
  creatorId,
  reactions,
  spiritScore,
  positivityRatio,
  onReact,
}: VisionReactionBarProps) {
  const { supabase } = useSupabase();
  const router = useRouter();

  // ⭐ Authenticated user
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isCreator = uid === creatorId;

  async function handleReact(maskTier: number) {
    if (!uid || loading) return;
    setLoading(true);

    // 1. Save reaction
    const { error } = await supabase.from("reactions").insert({
      post_id: postId,
      post_type: "vision",
      user_id: uid,
      maskTier,
    });

    setLoading(false);

    if (error) {
      console.error("vision_reaction error:", error);
      return;
    }

    // 2. Positive reaction triggers SpiritToast
    if (maskTier >= 3) {
      setToastMessage("Your reaction uplifts the spirits ✨");
    }

    // ⭐ 3. Fetch YOUR OWN push subscription (correct)
    const { data: sub } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", uid) // logged-in user ONLY
      .single();

    // ⭐ 4. Insert notification into database
    await fetch("/functions/v1/create-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId: creatorId,
        actorId: uid,
        postId,
        postType: "vision",
        message: `${email || "Someone"} reacted to your vision`,
        eventType: "reaction",
      }),
    });

    // ⭐ 5. Trigger push notification
    if (sub?.subscription) {
      await fetch(
        "https://dnhklmhwbkfhbolskqnt.supabase.co/functions/v1/send-push",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: sub.subscription,
            payload: {
              title: "New Reaction 👁️",
              body: `${email || "Someone"} reacted to your vision`,
              icon: "/icons/mman-192.png",
              url: `/vision/${postId}`,
            },
          }),
        }
      );
    }

    // 6. Refresh feed
    router.refresh();

    // 7. Update UI
    onReact();
  }

  return (
    <div className="flex gap-6 mt-4 items-center">

      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {isCreator && (
        <>
          <button
            onClick={() => handleReact(1)}
            disabled={loading}
            className="text-3xl flex flex-col items-center disabled:opacity-40"
          >
            😶‍🌫️
            <span className="text-xs text-gray-400">{reactions.mask1}</span>
          </button>

          <button
            onClick={() => handleReact(2)}
            disabled={loading}
            className="text-3xl flex flex-col items-center disabled:opacity-40"
          >
            😈
            <span className="text-xs text-gray-400">{reactions.mask2}</span>
          </button>
        </>
      )}

      <button
        onClick={() => handleReact(3)}
        disabled={loading}
        className="text-3xl flex flex-col items-center disabled:opacity-40"
      >
        😊
        <span className="text-xs text-gray-400">{reactions.mask3}</span>
      </button>

      <button
        onClick={() => handleReact(4)}
        disabled={loading}
        className="text-3xl flex flex-col items-center disabled:opacity-40"
      >
        🤩
        <span className="text-xs text-gray-400">{reactions.mask4}</span>
      </button>

      <button
        onClick={() => handleReact(5)}
        disabled={loading}
        className="text-3xl flex flex-col items-center disabled:opacity-40"
      >
        😇
        <span className="text-xs text-gray-400">{reactions.mask5}</span>
      </button>

      <button
        onClick={() => handleReact(6)}
        disabled={loading}
        className="text-3xl flex flex-col items-center disabled:opacity-40"
      >
        👑
        <span className="text-xs text-gray-400">{reactions.mask6}</span>
      </button>
    </div>
  );
}
