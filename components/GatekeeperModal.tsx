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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-gray-200 space-y-5">
        
        <h2 className="text-xl font-semibold text-gray-900 text-center">
          Mmanwu Gatekeeper
        </h2>

        <p className="text-gray-600 text-sm text-center">
          Choose the version that best expresses your message.
        </p>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {options.map((opt, idx) => (
            <div
              key={idx}
              onClick={() => setSelected(opt.text)}
              className={`
                p-4 rounded-xl border cursor-pointer transition-all
                ${
                  selected === opt.text
                    ? "border-purple-600 bg-purple-50"
                    : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                }
              `}
            >
              <div className="font-semibold text-purple-700 mb-1">
                {opt.label}
              </div>

              <div className="text-gray-800 whitespace-pre-line leading-relaxed">
                {opt.text}
              </div>

              {opt.explanation && (
                <div className="text-gray-500 text-xs mt-2 leading-snug">
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
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Regenerate
            </button>
          )}

          <div className="flex space-x-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300"
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
                    : "bg-purple-200 text-gray-500"
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
