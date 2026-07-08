"use client";

import { useEffect } from "react";

export default function SWRegister() {
  useEffect(() => {
    // 🚫 Temporarily disable service worker registration
    // This breaks the Vercel deadlock caused by the old SW.
    console.log("Service worker registration temporarily disabled");
  }, []);

  return null;
}
