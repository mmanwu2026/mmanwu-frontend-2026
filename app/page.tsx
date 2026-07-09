"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Delay navigation so Safari can hydrate and detect PWA metadata
    const timer = setTimeout(() => {
      router.replace("/plaza");
    }, 300);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{
      background: "black",
      height: "100vh",
      width: "100vw",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontSize: "1.5rem"
    }}>
      Loading…
    </div>
  );
}
