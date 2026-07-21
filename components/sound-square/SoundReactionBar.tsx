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

  const isCreator = uid === creatorId;

  async function handleReact(maskTier: number) {
    if (!uid || loading) return;

    setLoading(true);

    // 1. Save reaction
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

 // ⭐ 2. Fetch YOUR OWN push subscription (SAFE)
const { data: rows } = await supabase
  .from("push_subscriptions")
  .select("subscription")
  .eq("user_id", uid) // logged-in user ONLY
  .limit(1);

const sub = rows?.[0] ?? null;

// ⭐ 3. Insert notification into database
await fetch("/functions/v1/create-notification", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    recipientId: creatorId,
    actorId: uid,
    postId,
    postType: "sound",   // ⭐ FIXED
    message: `${email || "Someone"} reacted to your post`,
    eventType: "reaction",
  }),
});

    // ⭐ 4. Trigger push notification
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

    // 5. Refresh UI
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
