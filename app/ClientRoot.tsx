"use client";

import { useEffect } from "react";
import ProvidersWrapper from "./providers-wrapper";
import CallListener from "@/components/CallListener";
import AppInstallPrompt from "@/components/AppInstallPrompt";
import PushInitializer from "@/app/PushInitializer";
import UpdateBanner from "@/components/UpdateBanner";
import { registerServiceWorker } from "@/app/register-sw";

export default function ClientRoot({ children }: { children: React.ReactNode }) {

  // ⭐ 1. Register SW
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // ⭐ 2. Listen for SW → client navigation messages
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "navigate" && event.data.url) {
          window.location.href = event.data.url;
        }
      });
    }
  }, []);

  return (
    <>
      <div id="modal-root"></div>

      <ProvidersWrapper>
        <UpdateBanner />
        <PushInitializer />
        <AppInstallPrompt />
        <CallListener />

        <div className="pt-20">
          {children}
        </div>
      </ProvidersWrapper>
    </>
  );
}
