"use client";

import { ClientProviders } from "./client-providers";
import AuthNav from "@/components/AuthNav";
import { UnreadProvider } from "@/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/components/UpdateBanner";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <UnreadProvider>
        {/* ⭐ AuthNav must be ABOVE the scrollable content */}
        <AuthNav />

        {/* Global banner */}
        <UpdateBanner />

        <SWRegister />

        {/* ⭐ Page content (scrolls BELOW AuthNav) */}
        <div className="w-full">
          {children}
        </div>
      </UnreadProvider>
    </ClientProviders>
  );
}
