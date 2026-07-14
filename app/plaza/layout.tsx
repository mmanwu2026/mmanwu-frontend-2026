"use client";

import ComposePill from "@/components/ComposePill";

export default function PlazaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full min-h-screen">
      {/* ⭐ ComposePill ONLY appears on Plaza */}
      <ComposePill />

      {children}
    </div>
  );
}
