"use client";

import React, { useState } from "react";
import { useUser } from "@/context/UserContext";   // ⭐ ADDED

interface ReactionBarProps {
  postId: string;
  creatorId: string;
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
  };
  spiritScore?: number;
  positivityRatio?: number;
  onReact?: (updatedPost: any) => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function ReactionBar({
  postId,
  creatorId,
  reactions,
  spiritScore = 0,
  positivityRatio = 0.5,
  onReact,
}: ReactionBarProps) {
  const { user, loading } = useUser();             // ⭐ ADDED

  const [selected, setSelected] = useState<number | null>(null);
  const [loadingReaction, setLoadingReaction] = useState(false);

  const handleReact = async (maskTier: number) => {
    if (loadingReaction) return;
    if (loading || !user) return;                  // ⭐ Prevent reacting before identity loads

    setLoadingReaction(true);
    setSelected(maskTier);

    try {
      const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          maskTier,
          userId: user.id,                         // ⭐ REAL USER ID
        }),
      });

      const data = await res.json();

      if (onReact && data.post) {
        onReact(data.post);
      }
    } catch (err) {
      console.error("Reaction error:", err);
    }

    setLoadingReaction(false);
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
      {maskData.map((mask) => (
        <button
  key={mask.tier}
  onClick={() => handleReact(mask.tier)}
  disabled={loading || !user}
  className="flex flex-col items-center cursor-pointer transition-all"
>
  <div className="relative">

    {/* 🔥 D4 PULSE RING */}
    {selected === mask.tier && (
      <div className="reaction-pulse-ring"></div>
    )}

    {/* 🔥 D4 MASK ICON */}
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

  {/* 🔥 D4 COUNT GLOW */}
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
