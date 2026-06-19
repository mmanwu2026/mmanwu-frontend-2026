"use client";

import React, { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useUser } from "@/context/UserContext";

interface ReactionBarProps {
  postId: number;
  creatorId: string;
  reactions?: {
    mask1?: number;
    mask2?: number;
    mask3?: number;
    mask4?: number;
    mask5?: number;
  };
  spiritScore?: number;
  positivityRatio?: number;
  onReact?: () => void;
}

export default function ReactionBar({
  postId,
  creatorId,
  reactions = {},
  spiritScore = 0,
  positivityRatio = 0.5,
  onReact,
}: ReactionBarProps) {
  const supabase = createSupabaseBrowserClient();
  const { user, loading } = useUser();

  const [loadingReaction, setLoadingReaction] = useState(false);

  const handleReact = async (maskTier: number) => {
    if (loadingReaction) return;
    if (loading || !user) return;

    setLoadingReaction(true);

    await supabase.from("reactions").insert({
      post_id: postId,
      user_id: user.id,
      maskTier,
    });

    // ⭐ wait for Supabase commit before fetching posts
    setTimeout(() => {
      if (onReact) onReact();
      setLoadingReaction(false);
    }, 150);
  };

  const maskData = [
    { tier: 1, emoji: "😶‍🌫️", count: reactions.mask1 ?? 0 },
    { tier: 2, emoji: "😤", count: reactions.mask2 ?? 0 },
    { tier: 3, emoji: "😊", count: reactions.mask3 ?? 0 },
    { tier: 4, emoji: "🤩", count: reactions.mask4 ?? 0 },
    { tier: 5, emoji: "😇", count: reactions.mask5 ?? 0 },
  ];

  return (
    <div className="flex items-center gap-4 mt-4">
      {maskData.map((mask) => (
        <button
          key={mask.tier}
          onClick={() => handleReact(mask.tier)}
          disabled={loading || !user}
          className="flex flex-col items-center cursor-pointer transition-all"
        >
          <div className="relative">
            <div
              className={`
                reaction-mask
                w-10 h-10 rounded-xl flex items-center justify-center text-xl
                transition-all duration-200
                aura-tier-${mask.tier}
                mask-pop
              `}
            >
              {mask.emoji}
            </div>
          </div>

          <span className="reaction-count mt-1 text-xs">
            {mask.count}
          </span>
        </button>
      ))}
    </div>
  );
}
