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
  spiritScore?: number;
  positivityRatio?: number;
  onReact?: () => void;
}

const baseUrl = "https://mmanwu-clean-production-6465.up.railway.app";

export default function ReactionBar({
  postId,
  userId,
  reactions,
  spiritScore = 50,
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
    { tier: 1, label: "Dark Whisper", count: reactions.mask1 },
    { tier: 2, label: "Fierce Awakener", count: reactions.mask2 },
    { tier: 3, label: "Warm Guardian", count: reactions.mask3 },
    { tier: 4, label: "Joyful Spirit", count: reactions.mask4 },
    { tier: 5, label: "Radiant Ascender", count: reactions.mask5 },
  ];

  const getMouthPath = (tier: number) => {
    if (tier >= 5) return "M22 40 Q32 48 42 40";
    if (tier === 4) return "M22 40 Q32 46 42 40";
    if (tier === 3) return "M22 38 Q32 36 42 38";
    if (tier === 2) return "M22 42 Q32 32 42 42";
    return "M22 42 Q32 34 42 42";
  };

  const getEyeClass = (tier: number) => {
    if (tier >= 5) return "eye-joy";
    if (tier === 4) return "eye-happy";
    if (tier === 3) return "eye-neutral";
    if (tier === 2) return "eye-serious";
    return "eye-dark";
  };

  const getEmotionClass = () => {
    if (positivityRatio > 0.75) return "emotion-boost";
    if (positivityRatio > 0.55) return "emotion-intense";
    if (positivityRatio < 0.25) return "emotion-soft";
    return "emotion-calm";
  };

  const getAscensionClass = () => {
    if (spiritScore > 200) return "ascend-tier-4";
    if (spiritScore > 150) return "ascend-tier-3";
    if (spiritScore > 100) return "ascend-tier-2";
    return "ascend-tier-1";
  };

  const getSurgeClass = () => {
    if (spiritScore > 200) return "surge-strong";
    if (spiritScore > 150) return "surge-medium";
    return "surge-weak";
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
            <div className="relative">
              {selected === mask.tier && <div className="energy-ripple"></div>}
              {selected === mask.tier && <div className="pulse-ring"></div>}

              <div
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  transition-all duration-200
                  mask-hover mask-breathe mask-color-pulse expression-shift
                  mask-tier-${mask.tier}
                  mask-aura ${getEmotionClass()} ${getAscensionClass()} ${getSurgeClass()}
                  ${selected === mask.tier ? "mask-pop mask-glow-strong emotion-bounce" : ""}
                `}
                style={{
                  "--blink-offset": index % 3,
                  "--spirit-score": spiritScore,
                  "--positivity-ratio": positivityRatio,
                } as React.CSSProperties}
              >
                <svg width="26" height="26" viewBox="0 0 64 64">
                  <circle cx="24" cy="28" r="4" fill="#fff" className={`mask-eyes ${eyeClass}`} />
                  <circle cx="40" cy="28" r="4" fill="#fff" className={`mask-eyes ${eyeClass}`} />
                  <path d={mouthPath} stroke="#fff" strokeWidth="3" fill="none" className="mask-mouth" />
                </svg>
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
