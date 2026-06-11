"use client";

import React, { useState } from "react";

interface ReactionBarProps {
  postId: string;
  userId: string;        // viewer
  creatorId: string;     // post owner
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
  };
  spiritScore?: number;
  positivityRatio?: number;
  onReact?: () => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function ReactionBar({
  postId,
  userId,
  creatorId,
  reactions,
  spiritScore = 0,
  positivityRatio = 0.5,
  onReact,
}: ReactionBarProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReact = async (maskTier: number) => {
    if (loading) return;
    setLoading(true);
    setSelected(maskTier);

    try {
      await fetch(`${BACKEND_URL.replace(/\/$/, "")}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, maskTier }),
      });

      if (onReact) onReact();
    } catch (err) {
      console.error("Reaction error:", err);
    }

    setLoading(false);
  };

  const maskData = [
    { tier: 1, emoji: "😶‍🌫️", count: reactions.mask1 },
    { tier: 2, emoji: "😤", count: reactions.mask2 },
    { tier: 3, emoji: "😊", count: reactions.mask3 },
    { tier: 4, emoji: "🤩", count: reactions.mask4 },
    { tier: 5, emoji: "😇", count: reactions.mask5 },
  ];

  return (
    <div className="flex items-center gap-4 mt-4">
      {maskData.map((mask) => {
        const isDisabled = mask.tier <= 2 && userId !== creatorId;

        return (
          <button
            key={mask.tier}
            disabled={isDisabled}
            onClick={() => handleReact(mask.tier)}
            className={`
              flex flex-col items-center transition-all
              ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <div className="relative">
              {selected === mask.tier && <div className="energy-ripple"></div>}
              {selected === mask.tier && <div className="pulse-ring"></div>}

              <div
                className={`
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
                text-xs text-gray-300 mt-1
                ${selected === mask.tier ? "count-float" : ""}
              `}
            >
              {mask.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
