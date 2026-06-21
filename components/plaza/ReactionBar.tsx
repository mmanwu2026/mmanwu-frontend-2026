"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabase-browser";   // ✅ FIXED

interface ReactionBarProps {
  postId: string;
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
  spiritScore,
  positivityRatio,
  onReact,
}: ReactionBarProps) {

  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const loggedOut = !user;
  const isCreator = user?.id === creatorId;

  const handleReact = async (maskTier: number) => {
    if (loading || loggedOut) return;
    setLoading(true);

    console.log("postId:", postId);
    console.log("userId:", user?.id);
    console.log("maskTier:", maskTier);

    const { data, error } = await supabase.rpc("react_to_post", {
      args: [
        postId,        // p_post_id
        "plaza",       // p_post_type
        maskTier,      // p_maskTier
        user!.id       // p_user_id
      ]
    });

    console.log("RPC data:", data);
    console.log("RPC error:", error);

    setLoading(false);
    onReact();
  };

  return (
    <div className="flex items-center justify-center gap-6 mt-4">

      {/* ⭐ Mask 1 — Creator Only */}
      {isCreator && (
        <button
          onClick={() => handleReact(1)}
          disabled={loggedOut || loading}
          className="reaction-mask text-3xl disabled:opacity-40"
        >
          😶‍🌫️
          <span className="text-xs block text-gray-400">{reactions.mask1}</span>
        </button>
      )}

      {/* ⭐ Mask 2 — Creator Only */}
      {isCreator && (
        <button
          onClick={() => handleReact(2)}
          disabled={loggedOut || loading}
          className="reaction-mask text-3xl disabled:opacity-40"
        >
          😤
          <span className="text-xs block text-gray-400">{reactions.mask2}</span>
        </button>
      )}

      {/* ⭐ Mask 3 — Everyone */}
      <button
        onClick={() => handleReact(3)}
        disabled={loggedOut || loading}
        className="reaction-mask text-3xl disabled:opacity-40"
      >
        😊
        <span className="text-xs block text-gray-400">{reactions.mask3}</span>
      </button>

      {/* ⭐ Mask 4 — Everyone */}
      <button
        onClick={() => handleReact(4)}
        disabled={loggedOut || loading}
        className="reaction-mask text-3xl disabled:opacity-40"
      >
        🤩
        <span className="text-xs block text-gray-400">{reactions.mask4}</span>
      </button>

      {/* ⭐ Mask 5 — Everyone */}
      <button
        onClick={() => handleReact(5)}
        disabled={loggedOut || loading}
        className="reaction-mask text-3xl disabled:opacity-40"
      >
        😇
        <span className="text-xs block text-gray-400">{reactions.mask5}</span>
      </button>

      {/* ⭐ Mask 6 — Display Only */}
      <div className="reaction-mask text-3xl opacity-70 cursor-default">
        🔱
        <span className="text-xs block text-gray-400">{reactions.mask6}</span>
      </div>
    </div>
  );
}
