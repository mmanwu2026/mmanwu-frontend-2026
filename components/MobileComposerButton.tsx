"use client";

import React from "react";

export default function MobileComposerButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
  onClick={onOpen}
  className="
    fixed bottom-20 left-1/2 -translate-x-1/2
    w-16 h-16 rounded-full
    bg-purple-600 text-white
    shadow-xl shadow-purple-300/40
    flex items-center justify-center
    text-3xl font-bold
    z-[1000]   /* ⭐ FIXED — lower than BottomNav */
    active:scale-95 transition
    mb-[env(safe-area-inset-bottom)]
  "
>
  +
</button>
  );
}
