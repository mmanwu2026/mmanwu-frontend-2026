// app/redirector.tsx — CLIENT COMPONENT
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Redirector() {
  const router = useRouter();

  useEffect(() => {
    // iOS Safari needs more time to evaluate PWA installability
    const timer = setTimeout(() => {
      router.replace("/plaza");
    }, 3000); // ⭐ Increase delay to 3000ms

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
