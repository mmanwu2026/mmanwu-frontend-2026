"use client";

import { useState } from "react";
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
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);

  const handleReact = async (maskTier: number) => {
    if (loading) return;
    setLoading(true);

    await supabase.rpc("react_to_post", {
      p_post_id: postId,
      p_user_id: creatorId,
      p_mask_tier: maskTier,
    });

    setLoading(false);
    onReact();
  };

  return (
    <div className="flex items-center justify-between mt-4">
      <button onClick={() => handleReact(3)} className="text-2xl">😊</button>
      <button onClick={() => handleReact(4)} className="text-2xl">🤩</button>
      <button onClick={() => handleReact(5)} className="text-2xl">😇</button>
    </div>
  );
}
