"use client";

import { useEffect } from "react";
import ProvidersWrapper from "./providers-wrapper";
import CallListener from "@/components/CallListener";
import AppInstallPrompt from "@/components/AppInstallPrompt";
import PushInitializer from "@/app/PushInitializer";

export default function ClientRoot({ children }: { children: React.ReactNode }) {

  // ⭐ AUTOMATIC SERVICE WORKER MIGRATION (phones included)
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => {
        const url = reg.active?.scriptURL || "";

        // Remove old Web Push worker
        if (url.includes("sw.js")) {
          console.log("Removing old Web Push service worker:", url);
          reg.unregister();
        }
      });

      // Register Firebase Messaging worker
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then(() => console.log("Firebase messaging SW registered"))
        .catch(err => console.error("FCM SW registration failed:", err));
    });
  }, []);

  // ⭐ OPTIONAL: Ask permission early on mobile
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  return (
    <>
      <div id="modal-root"></div>

      <ProvidersWrapper>
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
