"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";
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
  const supabase = useSupabase();
  const { user } = useUser();

  const [loading, setLoading] = useState(false);

  const loggedOut = !user;
  const isCreator = user?.id === creatorId;

  const handleReact = async (maskTier: number): Promise<void> => {
  if (loading || loggedOut || !user) return;

  setLoading(true);

  const { error } = await supabase.from("reactions").insert({
    post_id: postId,
    post_type: postType,   // plaza | sound | vision
    user_id: user.id,
    maskTier,
  });

  setLoading(false);

  if (error) {
    console.error("apply_reaction error:", error);
    return;
  }

  onReact();
};

  return (
    <div className="flex items-center justify-center gap-6 mt-4">
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

      <button
        onClick={() => handleReact(3)}
        disabled={loggedOut || loading}
        className="reaction-mask text-3xl disabled:opacity-40"
      >
        😊
        <span className="text-xs block text-gray-400">{reactions.mask3}</span>
      </button>

      <button
        onClick={() => handleReact(4)}
        disabled={loggedOut || loading}
        className="reaction-mask text-3xl disabled:opacity-40"
      >
        🤩
        <span className="text-xs block text-gray-400">{reactions.mask4}</span>
      </button>

      <button
        onClick={() => handleReact(5)}
        disabled={loggedOut || loading}
        className="reaction-mask text-3xl disabled:opacity-40"
      >
        😇
        <span className="text-xs block text-gray-400">{reactions.mask5}</span>
      </button>

      <div className="reaction-mask text-3xl opacity-70 cursor-default">
        🔱
        <span className="text-xs block text-gray-400">{reactions.mask6}</span>
      </div>
    </div>
  );
}
