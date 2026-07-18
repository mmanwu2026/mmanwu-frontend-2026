"use client";

import { useEffect } from "react";
import ProvidersWrapper from "./providers-wrapper";
import CallListener from "@/components/CallListener";
import AppInstallPrompt from "@/components/AppInstallPrompt";
import PushInitializer from "@/app/PushInitializer";

export default function ClientRoot({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      // ⭐ Remove ONLY the old legacy push worker (if it existed)
      registrations.forEach((reg) => {
        const url = reg.active?.scriptURL || "";
        if (url.endsWith("/old-push-sw.js")) {
          console.log("Removing legacy push SW:", url);
          reg.unregister();
        }
      });

      // ⭐ Register Firebase Messaging SW
      await navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then(() => console.log("Firebase messaging SW registered"))
        .catch((err) => console.error("FCM SW registration failed:", err));

      // ⭐ Register the new UpdateBanner + caching SW
      await navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("UpdateBanner SW registered"))
        .catch((err) => console.error("UpdateBanner SW registration failed:", err));

      // ⭐ Listen for SW update messages and dispatch to UpdateBanner
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "sw-update") {
          window.dispatchEvent(new Event("sw-update"));
        }
      });

      // ⭐ Background Sync Scheduler (safe)
      if ("SyncManager" in window) {
        navigator.serviceWorker.ready.then((reg) => {
          const syncReg = reg as ServiceWorkerRegistration & {
            sync?: { register: (tag: string) => Promise<void> };
          };

          if (syncReg.sync) {
            setInterval(() => {
              syncReg.sync!.register("keepalive-sync").catch(() => {});
            }, 25000);
          }
        });
      }
    });
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
