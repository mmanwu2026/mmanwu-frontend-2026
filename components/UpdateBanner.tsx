"use client";

import { useEffect, useState } from "react";

export default function UpdateBanner() {
  const [show, setShow] = useState(false);

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
    <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 flex justify-between items-center shadow-lg z-50">
      <span>New version available</span>
      <button
        onClick={refreshApp}
        className="bg-white text-blue-600 px-3 py-1 rounded font-semibold"
      >
        Refresh
      </button>
    </div>
  );
}
