"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";
import { useSupabase } from "@/context/SupabaseContext";
import SpiritToast from "@/components/SpiritToast";
import { useRouter } from "next/navigation";   // ⭐ ADDED

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
  const supabase = useSupabase();
  const { user } = useUser();
  const router = useRouter();                  // ⭐ ADDED

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isCreator = user?.id === creatorId;

  async function handleReact(maskTier: number) {
    if (!user || loading) return;
    setLoading(true);

    const { error } = await supabase.from("reactions").insert({
      post_id: postId,
      post_type: "vision",
      user_id: user.id,
      maskTier,
    });

    setLoading(false);

    if (error) {
      console.error("vision_reaction error:", error);
      return;
    }

    // ⭐ Positive reaction triggers SpiritToast
    if (maskTier >= 3) {
      setToastMessage("Your reaction uplifts the spirits ✨");
    }

    // ⭐ CRITICAL FIX: Refresh FEED after reaction
    router.refresh();

    onReact();
  }

  return (
    <div className="flex gap-6 mt-4 items-center">

      {/* ⭐ SpiritToast */}
      {toastMessage && (
        <SpiritToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* ⭐ Creator-only reactions */}
      {isCreator && (
        <>
          <button
            onClick={() => handleReact(1)}
            className="text-3xl flex flex-col items-center"
          >
            😶‍🌫️
            <span className="text-xs text-gray-400">{reactions.mask1}</span>
          </button>

          <button
            onClick={() => handleReact(2)}
            className="text-3xl flex flex-col items-center"
          >
            😈
            <span className="text-xs text-gray-400">{reactions.mask2}</span>
          </button>
        </>
      )}

      {/* ⭐ Public reactions */}
      <button
        onClick={() => handleReact(3)}
        className="text-3xl flex flex-col items-center"
      >
        😊
        <span className="text-xs text-gray-400">{reactions.mask3}</span>
      </button>

      <button
        onClick={() => handleReact(4)}
        className="text-3xl flex flex-col items-center"
      >
        🤩
        <span className="text-xs text-gray-400">{reactions.mask4}</span>
      </button>

      <button
        onClick={() => handleReact(5)}
        className="text-3xl flex flex-col items-center"
      >
        😇
        <span className="text-xs text-gray-400">{reactions.mask5}</span>
      </button>

      {/* ⭐ Mask 6 — surprise tier (500+ SpiritScore) */}
      <button
        onClick={() => handleReact(6)}
        className="text-3xl flex flex-col items-center"
      >
        👑
        <span className="text-xs text-gray-400">{reactions.mask6}</span>
      </button>
    </div>
  );
}
