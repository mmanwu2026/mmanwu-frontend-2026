"use client";

import { ClientProviders } from "./client-providers";
import AuthNav from "@/components/AuthNav";
import { UnreadProvider } from "@/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/components/UpdateBanner";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      {/* ⭐ FIX: Give ProvidersWrapper a full-height flex column */}
      <div className="h-full flex flex-col">
        <UpdateBanner />
        <AuthNav />

        {/* ⭐ FIX: UnreadProvider must NOT collapse height */}
        <UnreadProvider>
          <SWRegister />

          {/* ⭐ children (PlazaPage) now inherits full height correctly */}
          <div className="flex-1 flex flex-col h-full">
            {children}
          </div>
        </UnreadProvider>
      </div>
    </ClientProviders>
  );
}
