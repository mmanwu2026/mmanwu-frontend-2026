"use client";

import { useEffect, useState } from "react";

interface UpdateBannerProps {
  authLoading?: boolean;
}

export default function UpdateBanner({ authLoading }: UpdateBannerProps) {
  const [show, setShow] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydration timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hydrated) setShow(true);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [hydrated]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Stuck login timeout
  useEffect(() => {
    if (authLoading) {
      const timeout = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timeout);
    }
  }, [authLoading]);

  // SW update event
  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener("sw-update", handler);
    return () => window.removeEventListener("sw-update", handler);
  }, []);

  if (!show) return null;

  function refreshApp() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  }

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-[64px] z-[9999]">
      <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3">
        <span className="font-medium text-sm">Refresh required</span>
        <button
          onClick={refreshApp}
          className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-semibold"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
