"use client";

import { useEffect } from "react";
import ProvidersWrapper from "./providers-wrapper";
import CallListener from "@/components/CallListener";
import AppInstallPrompt from "@/components/AppInstallPrompt";
import PushInitializer from "@/app/PushInitializer";
import UpdateBanner from "@/components/UpdateBanner";   // ⭐ restore this import
import { registerServiceWorker } from "@/app/register-sw";

export default function ClientRoot({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <>
      <div id="modal-root"></div>

      <ProvidersWrapper>
        <UpdateBanner />                     {/* ⭐ restore the refresh pill */}
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
