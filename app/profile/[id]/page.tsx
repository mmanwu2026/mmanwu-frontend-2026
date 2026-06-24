"use client";

import { useEffect, useState } from "react";
import ProfileClient from "@/components/ProfileClient";

export default function Page({ params }: { params: { id?: string } }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for hydration so params.id is guaranteed
    setReady(true);
  }, []);

  if (!ready || !params.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <ProfileClient userId={params.id} />
    </div>
  );
}
