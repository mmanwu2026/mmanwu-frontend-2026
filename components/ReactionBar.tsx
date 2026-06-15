"use client";

import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
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
  onReact?: (updatedPost: any) => void;
}

export default function ReactionBar({
  postId,
  creatorId,
  reactions = {},
  spiritScore = 0,
  positivityRatio = 0.5,
  onReact,
}: ReactionBarProps) {
  const { user, loading } = useUser();

  const [selected, setSelected] = useState<number | null>(null);
  const [loadingReaction, setLoadingReaction] = useState(false);

  const handleReact = async (maskTier: number) => {
    if (loadingReaction) return;
    if (loading || !user) return;

    setLoadingReaction(true);
    setSelected(maskTier);

    // ⭐ Update reaction in Supabase
    const { data, error } = await supabase
      .from("posts")
      .update({
        spirit_score: (spiritScore ?? 0) + (maskTier >= 3 ? 2 : -1),
        mask: maskTier,
      })
      .eq("id", postId)
      .select()
      .single();

    if (error) {
      console.error("Reaction error:", error);
    } else if (onReact && data) {
      onReact(data);
    }

    setLoadingReaction(false);
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
            {selected === mask.tier && (
              <div className="reaction-pulse-ring"></div>
            )}

            <div
              className={`
                reaction-mask
                w-10 h-10 rounded-xl flex items-center justify-center text-xl
                transition-all duration-200
                aura-tier-${mask.tier}
                ${selected === mask.tier ? "mask-pop mask-glow-strong" : ""}
              `}
              style={{
                "--spirit-score": spiritScore,
                "--positivity-ratio": positivityRatio,
              } as React.CSSProperties}
            >
              {mask.emoji}
            </div>
          </div>

          <span
            className={`
              reaction-count mt-1 text-xs
              ${selected === mask.tier ? "count-float" : ""}
            `}
          >
            {mask.count}
          </span>
        </button>
      ))}
    </div>
  );
}
