"use client";

import { useState } from "react";
import SoundSquareUpload from "@/app/sound-square/create/page";

export default function FloatingComposer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="
          fixed bottom-6 right-6 z-[5000]
          bg-purple-600 hover:bg-purple-500
          text-white px-5 py-3 rounded-full
          shadow-lg shadow-purple-900/40
          transition-all
        "
      >
        + Upload Sound
      </button>

      {open && (
        <div
          className="
            fixed inset-0 z-[6000]
            bg-black/70 backdrop-blur-md
            flex items-end justify-center
          "
          onClick={() => setOpen(false)}
        >
          <div
            className="
              bg-gray-900 w-full max-w-xl
              rounded-t-2xl p-6
              shadow-xl
            "
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white mb-4"
            >
              Close ✕
            </button>

            <SoundSquareUpload />
          </div>
        </div>
      )}
    </>
  );
}
