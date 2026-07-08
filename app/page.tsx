"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Delay navigation so iOS can load manifest + SW
    const timer = setTimeout(() => {
      router.replace("/plaza");
    }, 50);

    return () => clearTimeout(timer);
  }, [router]);

  // Minimal app shell so Safari sees a real page
  return (
    <div style={{ background: "black", height: "100vh", width: "100vw" }}>
      <p style={{ color: "white", textAlign: "center", marginTop: "40vh" }}>
        Loading…
      </p>
    </div>
  );
}
