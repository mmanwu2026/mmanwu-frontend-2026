"use client";

import { useEffect, useState } from "react";

const FORCE_UPDATE = false; // manual trigger if needed

export default function UpdateBanner({ authLoading }: { authLoading: boolean }) {
  const [show, setShow] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // ⭐ Hydration detection (3s timeout)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hydrated) {
        setShow(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [hydrated]);

  // ⭐ Mark hydration complete
  useEffect(() => {
    setHydrated(true);
  }, []);

  // ⭐ Detect stuck login (5s timeout)
  useEffect(() => {
    if (authLoading) {
      const timeout = setTimeout(() => {
        setShow(true);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [authLoading]);

  // ⭐ Manual trigger
  useEffect(() => {
    if (FORCE_UPDATE) {
      setShow(true);
    }
  }, []);

  // ⭐ Listen for SW update events
  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener("sw-update", handler);
    return () => window.removeEventListener("sw-update", handler);
  }, []);

  // ⭐ Add/remove body padding to prevent AuthNav overlap
  useEffect(() => {
    if (show) {
      document.body.classList.add("has-update-banner");
    } else {
      document.body.classList.remove("has-update-banner");
    }
  }, [show]);

  if (!show) return null;

  // ⭐ Refresh logic
  function refreshApp() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  }

  return (
    <div className="fixed top-0 left-0 w-full h-14 z-[999] bg-blue-600 text-white px-4 flex justify-between items-center shadow-lg">
      <span className="font-medium">New version available — refresh required</span>
      <button
        onClick={refreshApp}
        className="bg-white text-blue-600 px-3 py-1 rounded font-semibold"
      >
        Refresh
      </button>
    </div>
  );
}
