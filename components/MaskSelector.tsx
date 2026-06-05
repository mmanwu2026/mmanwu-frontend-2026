"use client";

const masks = [
  {
    id: 1,
    name: "Dark Whisper",
    color: "bg-gray-900",
    text: "text-gray-100",
    disabled: true,
    description: "Reserved for the creator — introspection, shadow, truth.",
  },
  {
    id: 2,
    name: "Fierce Awakener",
    color: "bg-red-700",
    text: "text-red-100",
    disabled: true,
    description: "Creator-only mask — confrontation, fire, transformation.",
  },
  {
    id: 3,
    name: "Neutral Mask",
    color: "bg-yellow-600",
    text: "text-yellow-100",
    disabled: false,
    description: "Balance, clarity, steady presence.",
  },
  {
    id: 4,
    name: "Bright Mask",
    color: "bg-green-600",
    text: "text-green-100",
    disabled: false,
    description: "Encouragement, uplift, positive resonance.",
  },
  {
    id: 5,
    name: "Radiant Mask",
    color: "bg-blue-700",
    text: "text-blue-100",
    disabled: false,
    description: "Joy, celebration, high emotional energy.",
  },
];

export default function MaskSelector({ value, onChange }: any) {
  return (
    <div>
      <h2 className="font-semibold mb-2">Choose Mask</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {masks.map((mask) => {
          const isSelected = value === mask.id;

          return (
            <button
              key={mask.id}
              disabled={mask.disabled}
              onClick={() => onChange(mask.id)}
              className={`
                p-4 rounded-xl border-2 transition-all duration-200
                ${mask.color} ${mask.text}
                ${mask.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                ${isSelected ? "scale-105 border-white shadow-lg" : "border-transparent"}
              `}
            >
              <div className="text-lg font-bold">Mask {mask.id}</div>
              <div className="text-sm opacity-90">{mask.name}</div>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-gray-600">
        Mask 1 & 2 are creator-only emotional masks.
      </p>
    </div>
  );
}
