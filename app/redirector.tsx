// app/redirector.tsx — CLIENT COMPONENT
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Redirector() {
  const router = useRouter();

  useEffect(() => {
    // Delay redirect for PWA installability
    const timer = setTimeout(() => {
      router.replace("/plaza");
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
