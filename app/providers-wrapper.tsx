"use client";

import { ClientProviders } from "./client-providers";
import AuthNav from "@/components/AuthNav";
import { UnreadProvider } from "@/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/components/UpdateBanner";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      {/* ⭐ FIXED: remove h-full, use real device height */}
      <div className="flex flex-col min-h-[100dvh]">
        <UpdateBanner />
        <AuthNav />

        <UnreadProvider>
          <SWRegister />

          {/* children now inherit correct full height */}
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        </UnreadProvider>
      </div>
    </ClientProviders>
  );
}
