"use client";

import { ClientProviders } from "./client-providers";
import AuthNav from "@/app/components/AuthNav";
import { UnreadProvider } from "@/app/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/components/UpdateBanner";
import BottomNav from "@/app/components/BottomNav";

export default function ProvidersWrapper({ children }) {
  return (
    <ClientProviders>
      <UnreadProvider>

        {/* Entire app must fill viewport */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* Top nav */}
          <div className="fixed top-0 left-0 w-full z-[1000]">
            <AuthNav />
          </div>

          <UpdateBanner />
          <SWRegister />

          {/* Scrollable content area */}
          <div className="flex-1 pt-[60px] pb-[80px] overflow-y-auto">
            {children}
          </div>

          {/* Bottom nav (fixed to viewport) */}
          <BottomNav />

        </div>

      </UnreadProvider>
    </ClientProviders>
  );
}


