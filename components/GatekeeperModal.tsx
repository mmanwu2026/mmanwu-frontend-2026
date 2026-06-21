"use client";

import React, { useState } from "react";

export interface GatekeeperOption {
  label: string;
  text: string;
  explanation?: string;
}

interface GatekeeperModalProps {
  options: GatekeeperOption[];
  onSelect: (text: string) => void;
  onClose: () => void;
  onRegenerate?: () => void;
}

export default function GatekeeperModal({
  options,
  onSelect,
  onClose,
  onRegenerate,
}: GatekeeperModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d0f] border border-white/20 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
        
        <h2 className="text-xl font-semibold text-white text-center">
          Mmanwu Gatekeeper
        </h2>

        <p className="text-gray-300 text-sm text-center">
          Choose the version that best expresses your message.
        </p>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {options.map((opt: GatekeeperOption, idx: number) => (
            <div
              key={idx}
              onClick={() => setSelected(opt.text)}
              className={`
                p-4 rounded-xl border cursor-pointer transition-all
                ${
                  selected === opt.text
                    ? "border-purple-500 bg-purple-500/20"
                    : "border-white/20 bg-white/5 hover:bg-white/10"
                }
              `}
            >
              <div className="font-semibold text-purple-300 mb-1">
                {opt.label}
              </div>

              <div className="text-gray-200 whitespace-pre-line leading-relaxed">
                {opt.text}
              </div>

              {opt.explanation && (
                <div className="text-gray-400 text-xs mt-2 leading-snug">
                  {opt.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="text-sm text-gray-300 hover:text-white"
            >
              Regenerate
            </button>
          )}

          <div className="flex space-x-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-700 text-gray-200 hover:bg-gray-600"
            >
              Cancel
            </button>

            <button
              disabled={!selected}
              onClick={() => selected && onSelect(selected)}
              className={`
                px-4 py-2 rounded-xl font-semibold
                ${
                  selected
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-purple-900/40 text-gray-500"
                }
              `}
            >
              Use This
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
