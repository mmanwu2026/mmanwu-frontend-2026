"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import ProvidersWrapper from "./providers-wrapper";
import CallListener from "@/components/CallListener";
import AppInstallPrompt from "@/components/AppInstallPrompt";
import PushInitializer from "@/app/PushInitializer";
import UpdateBanner from "@/components/UpdateBanner";
import { registerServiceWorker } from "@/app/register-sw";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // ⭐ Register SW once
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // ⭐ Global SW navigation listener (correct placement)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.serviceWorker) return;

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === "navigate" && data.url) {
        router.push(data.url);   // ⭐ Correct Next.js navigation
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  }, [router]);

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
