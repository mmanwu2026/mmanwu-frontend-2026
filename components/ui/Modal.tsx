"use client";

import { useEffect, useState, ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
};

export default function Modal({ children, onClose }: ModalProps) {
  // ⭐ Prevent hydration freeze
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // ⭐ Only lock scroll AFTER hydration
  useEffect(() => {
    if (!hydrated) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [hydrated]);

  // ⭐ Escape key close (only after hydration)
  useEffect(() => {
    if (!hydrated) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hydrated, onClose]);

  if (!hydrated) {
    // Render a safe placeholder backdrop during hydration
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md" />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg md:max-w-2xl md:rounded-xl bg-black border border-white/10 shadow-xl md:mx-0 mx-4 md:max-h-[80vh] max-h-screen overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
