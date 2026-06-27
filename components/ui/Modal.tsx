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

  // Debug: confirm modal component loads
  console.log("🔥 MODAL COMPONENT ACTIVE");

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
      className="portal-modal fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg md:max-w-2xl md:rounded-xl bg-black border border-white/10 shadow-xl md:mx-0 mx-4 md:max-h-[80vh] max-h-screen overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    modalRoot
  );
}
