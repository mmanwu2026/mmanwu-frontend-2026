"use client";

import { useEffect } from "react";

export default function SWRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-v2.js").then(() => {
        console.log("Service worker registered");
      });
    }
  }, []);

  return null;
}
