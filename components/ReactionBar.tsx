"use client";

import { useState } from "react";

interface ReactionBarProps {
  postId: string;
  creatorId: string;
  currentUserId: string;
}

type ReactionCounts = {
  [key: number]: number;
};

const MASKS = [
  { id: 1, label: "Dark Whisper", emoji: "🜂", creatorOnly: true },
  { id: 2, label: "Fierce Awakener", emoji: "🔥", creatorOnly: true },
  { id: 3, label: "Witness", emoji: "🜁", creatorOnly: false },
  { id: 4, label: "Harmony Caller", emoji: "✨", creatorOnly: false },
  { id: 5, label: "Uplift", emoji: "🌿", creatorOnly: false },
];

export default function ReactionBar({
  postId,
  creatorId,
  currentUserId,
}: ReactionBarProps) {
  const [selectedMask, setSelectedMask] = useState<number | null>(null);
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });

  const isCreator = currentUserId === creatorId;

  async function sendReaction(maskId: number) {
    try {
      const res = await fetch(
        "https://mmanwu-clean-production-6465.up.railway.app/reactions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: Number(postId),
            userId: currentUserId,
            maskTier: maskId,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Reaction error:", data.error);
        return;
      }

      setSelectedMask(maskId);

      if (data.reactions) {
        setReactionCounts(data.reactions as ReactionCounts);
      }
    } catch (err) {
      console.error("Network error:", err);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex gap-3">
        {MASKS.map((mask) => {
          const disabled = mask.creatorOnly && !isCreator;

          return (
            <button
              key={mask.id}
              disabled={disabled}
              onClick={() => sendReaction(mask.id)}
              className={`
                px-3 py-2 rounded-lg text-xl transition
                ${disabled ? "opacity-30 cursor-not-allowed" : "hover:scale-110"}
                ${selectedMask === mask.id ? "ring-2 ring-green-500" : ""}
              `}
              title={
                disabled
                  ? "Only the creator can use this mask"
                  : mask.label
              }
            >
              {mask.emoji} ({reactionCounts[mask.id] ?? 0})
            </button>
          );
        })}
      </div>
    </div>
  );
}
