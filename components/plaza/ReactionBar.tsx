"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface ReactionBarProps {
  postId: number;
  creatorId: string;
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
    mask6: number;
  };
  spiritScore: number;
  positivityRatio: number;
  onReact: () => void;
}

export default function ReactionBar({
  postId,
  creatorId,
  reactions,
  onReact,
}: ReactionBarProps) {
  const supabase = createSupabaseBrowserClient();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const isCreator = user.id === creatorId;

  const handleReact = async (maskTier: number) => {
    if (loading) return;
    setLoading(true);

    // ⭐ React to post
    await supabase.rpc("react_to_post", {
      p_post_id: postId,
      p_user_id: user.id,
      p_mask_tier: maskTier,
    });

    // ⭐ OPTIONAL: Refresh MV so SpiritScore updates instantly
    // await supabase.rpc("refresh_reaction_aggregates");

    setLoading(false);
    onReact();
  };

  return (
    <div className="flex items-center justify-center gap-6 mt-4">

      {/* ⭐ Mask 1 — Creator Only */}
      {isCreator && (
        <button
          onClick={() => handleReact(1)}
          disabled={loading}
          className="reaction-mask text-3xl"
        >
          😶‍🌫️
          <span className="text-xs block text-gray-400">{reactions.mask1}</span>
        </button>
      )}

      {/* ⭐ Mask 2 — Creator Only */}
      {isCreator && (
        <button
          onClick={() => handleReact(2)}
          disabled={loading}
          className="reaction-mask text-3xl"
        >
          😤
          <span className="text-xs block text-gray-400">{reactions.mask2}</span>
        </button>
      )}

      {/* ⭐ Mask 3 — Everyone */}
      <button
        onClick={() => handleReact(3)}
        disabled={loading}
        className="reaction-mask text-3xl"
      >
        😊
        <span className="text-xs block text-gray-400">{reactions.mask3}</span>
      </button>

      {/* ⭐ Mask 4 — Everyone */}
      <button
        onClick={() => handleReact(4)}
        disabled={loading}
        className="reaction-mask text-3xl"
      >
        🤩
        <span className="text-xs block text-gray-400">{reactions.mask4}</span>
      </button>

      {/* ⭐ Mask 5 — Everyone */}
      <button
        onClick={() => handleReact(5)}
        disabled={loading}
        className="reaction-mask text-3xl"
      >
        😇
        <span className="text-xs block text-gray-400">{reactions.mask5}</span>
      </button>

      {/* ⭐ Mask 6 — System / AutoMask (display only) */}
      <div className="reaction-mask text-3xl opacity-70 cursor-default">
        🔱
        <span className="text-xs block text-gray-400">{reactions.mask6}</span>
      </div>
    </div>
  );
}
