"use client";

import { ClientProviders } from "./client-providers";
import AuthNav from "@/app/components/AuthNav";
import { UnreadProvider } from "@/app/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/components/UpdateBanner";
import BottomNav from "@/app/components/BottomNav";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <UnreadProvider>

        {/* Top nav */}
        <div className="fixed top-0 left-0 w-full z-[1000]">
          <AuthNav />
        </div>

        <UpdateBanner />
        <SWRegister />

        {/* Page content */}
        <div className="pt-[60px] pb-[80px] w-full">
          {children}
        </div>

        {/* Bottom nav */}
        <BottomNav />

      </UnreadProvider>
    </ClientProviders>
  );
}
