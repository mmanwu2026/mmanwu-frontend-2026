"use client";

import { ClientProviders } from "./client-providers";
import AuthNavWrapper from "@/app/components/AuthNavWrapper";
import { UnreadProvider } from "@/app/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/components/UpdateBanner";
import BottomNav from "@/app/components/BottomNav";

export default function ProvidersWrapper({ children }) {
  return (
    <ClientProviders>
      <UnreadProvider>

        <div className="flex flex-col h-full min-h-0">

          {/* Top nav */}
          <div className="fixed top-0 left-0 w-full z-[1000]">
            <AuthNavWrapper />
          </div>

          <UpdateBanner />
          <SWRegister />

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 pb-[80px] overflow-y-auto">
            {children}
          </div>

          {/* Bottom nav */}
          <BottomNav />

        </div>

      </UnreadProvider>
    </ClientProviders>
  );
}
