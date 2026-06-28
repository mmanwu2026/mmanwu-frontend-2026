"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
};

export default function Modal({ children, onClose }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const root = document.getElementById("modal-root");
    setModalRoot(root);
  }, []);

  // Lock scroll
  useEffect(() => {
    if (!mounted) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mounted]);

  // Escape key closes modal
  useEffect(() => {
    if (!mounted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mounted, onClose]);

  if (!mounted || !modalRoot) return null;

  return createPortal(
    <div
      className="
        fixed inset-0 
        bg-black/70 
        backdrop-blur-sm 
        flex items-center justify-center 
        z-[2147483647]
      "
      onClick={onClose}
    >
      <div
        className="
          w-full 
          max-w-2xl 
          min-w-[90vw] md:min-w-[480px]

          bg-gray-100              /* ⭐ Light card background */
          text-black               /* ⭐ Black text */
          border border-gray-300   /* ⭐ Clean card border */
          shadow-xl shadow-black/30 /* ⭐ Soft depth shadow */
          rounded-xl 
          p-6 

          mx-4 md:mx-0             /* ⭐ Full width on desktop */
          max-h-[85vh] 
          overflow-y-auto
          overflow-x-hidden        /* ⭐ Prevents avatar glow overflow */
        "
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    modalRoot
  );
}
