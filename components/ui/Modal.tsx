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
        bg-black/40 
        backdrop-blur-sm 
        flex items-center justify-center 
        z-[2147483647]
      "
      onClick={onClose}
    >
      <div
        className="
          w-full 
          max-w-lg 
          bg-white 
          border border-gray-200 
          shadow-2xl 
          rounded-2xl 
          p-6 
          mx-4 
          max-h-[85vh] 
          overflow-y-auto
        "
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    modalRoot
  );
}
