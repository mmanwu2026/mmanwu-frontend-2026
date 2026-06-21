"use client";

import React, { useEffect } from "react";

interface SpiritToastProps {
  message: string;
  onClose: () => void;
}

export default function SpiritToast({ message, onClose }: SpiritToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 1800);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
      <div
        className="
          bg-black/80 text-white px-4 py-2 rounded-xl
          border border-white/10 shadow-lg
          toast-fade
        "
      >
        {message}
      </div>
    </div>
  );
}
