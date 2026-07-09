"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // iOS Safari needs ~1.5 seconds to evaluate PWA installability
    const timer = setTimeout(() => {
      router.replace("/plaza");
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      style={{
        background: "black",
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: "1.5rem",
      }}
    >
      <img
        src="/icons/icon-192x192.png"
        alt="Mman Plaza"
        style={{ width: 96, height: 96, marginBottom: 20 }}
      />
      <div>Loading Mman Plaza…</div>
    </div>
  );
}
