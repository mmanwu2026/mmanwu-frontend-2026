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
        bg-black/80 
        backdrop-blur-[2px] 
        flex items-center justify-center 
        z-[2147483647]
      "
      onClick={onClose}
    >
      <div
        className="
          w-full 
          max-w-2xl 
          bg-[#0d0d0f] 
          border border-white/10 
          shadow-2xl 
          rounded-xl 
          p-6 
          mx-4 
          max-h-[85vh] 
          overflow-y-auto
          overflow-x-hidden   /* ⭐ THE FIX */
        "
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    modalRoot
  );
}
