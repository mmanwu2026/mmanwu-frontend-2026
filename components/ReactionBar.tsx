"use client";

import React, { useState } from "react";

interface ReactionBarProps {
  postId: string;
  userId: string;
  reactions: {
    mask1: number;
    mask2: number;
    mask3: number;
    mask4: number;
    mask5: number;
  };
  onReact?: () => void;
}

const baseUrl = "https://mmanwu-clean-production-6465.up.railway.app";

export default function ReactionBar({
  postId,
  userId,
  reactions,
  onReact,
}: ReactionBarProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReact = async (maskTier: number) => {
    if (loading) return;
    setLoading(true);
    setSelected(maskTier);

    try {
      await fetch(`${baseUrl}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId, maskTier }),
      });

      if (onReact) onReact();
    } catch (err) {
      console.error("Reaction error:", err);
    }

    setLoading(false);
  };

  const maskData = [
    { tier: 1, label: "Dark Whisper", count: reactions.mask1, color: "#1A1A1A" },
    { tier: 2, label: "Fierce Awakener", count: reactions.mask2, color: "#3B0A0A" },
    { tier: 3, label: "Warm Guardian", count: reactions.mask3, color: "#2F3B0F" },
    { tier: 4, label: "Joyful Spirit", count: reactions.mask4, color: "#15406B" },
    { tier: 5, label: "Radiant Ascender", count: reactions.mask5, color: "#4A148C" },
  ];

  const getMouthPath = (tier: number) => {
    // Mythic style 3
    if (tier >= 5) {
      // Radiant joy
      return "M22 40 Q32 48 42 40";
    }
    if (tier === 4) {
      // Joyful
      return "M22 40 Q32 46 42 40";
    }
    if (tier === 3) {
      // Warm neutral-smile
      return "M22 38 Q32 36 42 38";
    }
    if (tier === 2) {
      // Stern
      return "M22 42 Q32 32 42 42";
    }
    // Tier 1 – dark neutral
    return "M22 42 Q32 34 42 42";
  };

  const getEyeClass = (tier: number) => {
    if (tier >= 5) return "eyes-bright";
    if (tier === 4) return "eyes-joyful";
    if (tier === 3) return "eyes-neutral";
    if (tier === 2) return "eyes-stern";
    return "eyes-dark";
  };

  return (
    <div className="flex items-center gap-4 mt-3">
      {maskData.map((mask, index) => {
        const isDisabled = mask.tier <= 2 && userId !== "creator";
        const mouthPath = getMouthPath(mask.tier);
        const eyeClass = getEyeClass(mask.tier);

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
            {/* === ANIMATED MASK WRAPPER === */}
            <div className="relative">
              {/* Energy ripple on click */}
              {selected === mask.tier && <div className="energy-ripple"></div>}

              {/* Pulse ring on click */}
              {selected === mask.tier && <div className="pulse-ring"></div>}

              <div
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  transition-all duration-200
                  mask-hover mask-breathe mask-color-pulse expression-shift
                  ${selected === mask.tier ? "mask-pop mask-glow-strong" : ""}
                `}
                style={{
                  backgroundColor: mask.color,
                  "--blink-offset": index % 3,
                } as React.CSSProperties}
              >
                <svg width="26" height="26" viewBox="0 0 64 64">
                  {/* Sharp anime eyes with tier-based classes */}
                  <circle
                    cx="24"
                    cy="28"
                    r="4"
                    fill="#fff"
                    className={`mask-eyes ${eyeClass}`}
                  />
                  <circle
                    cx="40"
                    cy="28"
                    r="4"
                    fill="#fff"
                    className={`mask-eyes ${eyeClass}`}
                  />
                  {/* Dynamic mythic mouth */}
                  <path
                    d={mouthPath}
                    stroke="#fff"
                    strokeWidth="3"
                    fill="none"
                    className="mask-mouth"
                  />
                </svg>
              </div>
            </div>

            {/* === ANIMATED COUNT === */}
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
