"use client";

import { useEffect } from "react";
import ProvidersWrapper from "./providers-wrapper";
import CallListener from "@/components/CallListener";
import AppInstallPrompt from "@/components/AppInstallPrompt";
import PushInitializer from "@/app/PushInitializer";
import { registerServiceWorker } from "@/app/register-sw";

export default function ClientRoot({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    registerServiceWorker();
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
