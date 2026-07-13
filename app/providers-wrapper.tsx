"use client";

import { ClientProviders } from "./client-providers";
import AuthNav from "@/app/components/AuthNav";
import { UnreadProvider } from "@/app/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/app/components/UpdateBanner";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <UnreadProvider>

        {/* ⭐ Navigation must be ABOVE all scrollable content */}
        <div className="fixed top-0 left-0 w-full z-[9999]">
          <AuthNav />
        </div>

        <UpdateBanner />
        <SWRegister />

        {/* ⭐ Scrollable content BELOW navigation */}
        <div className="pt-[60px] w-full">
          {children}
        </div>

      </UnreadProvider>
    </ClientProviders>
  );
}
