"use client";

import React from "react";

interface MaskSelectorProps {
  selectedMask: number;
  onSelect: (mask: number) => void;
}

export default function MaskSelector({ selectedMask, onSelect }: MaskSelectorProps) {
  const masks = [
    { id: 1, label: "Dark Whisper", emoji: "🜂", disabled: true },
    { id: 2, label: "Fierce Awakener", emoji: "🔥", disabled: true },
    { id: 3, label: "Neutral Mask", emoji: "🜁", disabled: false },
    { id: 4, label: "Bright Mask", emoji: "✨", disabled: false },
    { id: 5, label: "Radiant Mask", emoji: "🌿", disabled: false },
  ];

  return (
    <div className="grid grid-cols-5 gap-3 mt-4">
      {masks.map((m) => {
        const isSelected = selectedMask === m.id;

        return (
          <button
            key={m.id}
            disabled={m.disabled}
            onClick={() => onSelect(m.id)}
            className={`
              flex flex-col items-center justify-center p-2 rounded-xl border
              transition-all duration-200
              ${isSelected ? "border-white scale-110" : "border-gray-700"}
              ${m.disabled ? "opacity-40 cursor-not-allowed" : "hover:scale-105"}
            `}
          >
            <div className="text-2xl">{m.emoji}</div>
            <div className="text-[10px] text-gray-300 mt-1">{m.label}</div>
          </button>
        );
      })}
    </div>
  );
}
