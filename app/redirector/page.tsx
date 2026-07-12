"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Redirector() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/plaza");
    }, 3000); // iOS PWA activation window

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
        fontSize: "1.4rem",
        textAlign: "center",
        padding: "20px",
        opacity: 0.9,
      }}
    >
      <img
        src="/icons/icon-192x192.png"
        alt="Mman Plaza"
        style={{ width: 96, height: 96, marginBottom: 20 }}
      />

      <div style={{ marginBottom: 10 }}>
        <strong>Preparing your Plaza…</strong>
      </div>

      <div style={{ opacity: 0.7 }}>
        Just a moment while we finish setting things up.
      </div>
    </div>
  );
}
