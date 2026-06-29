"use client";

import { useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";

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
  const supabase = useSupabase();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const isCreator = user?.id === creatorId;

  async function handleReact(maskTier: number) {
    if (!user || loading) return;
    setLoading(true);

    const { error } = await supabase.from("reactions").insert({
      post_id: postId,
      post_type: "sound",
      user_id: user.id,
      maskTier,
    });

    setLoading(false);

    if (error) {
      console.error("sound_reaction error:", error);
      return;
    }

    onReact();
  }

  return (
    <div className="flex gap-6 mt-4 items-center">

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
    </div>
  );
}
