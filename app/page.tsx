"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EnableNotifications from "./enable-notifications";

export default function Home() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [enabled, setEnabled] = useState<string | null>(null);

  // ⭐ Ensure hydration before reading localStorage
  useEffect(() => {
    setHydrated(true);
    const flag = localStorage.getItem("notifications_enabled");
    setEnabled(flag);

    if (flag === "true") {
      router.replace("/redirector");
    }
  }, [router]);

  // ⭐ Prevent SSR mismatch — wait until hydration
  if (!hydrated) {
    return null;
  }

  // ⭐ If not enabled → show enable screen
  if (enabled !== "true") {
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
          textAlign: "center",
          padding: "20px",
        }}
      >
        <img
          src="/icons/icon-192x192.png"
          alt="Mman Plaza"
          style={{ width: 96, height: 96, marginBottom: 20 }}
        />

        <div style={{ marginBottom: 10 }}>
          <strong>Welcome to Mman Plaza</strong>
        </div>

        <div style={{ opacity: 0.8, marginBottom: 30 }}>
          Preparing your experience…
        </div>

        <EnableNotifications />
      </div>
    );
  }

  // ⭐ If enabled, redirector will handle delayed navigation
  return null;
}
