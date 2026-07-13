"use client";

import { ClientProviders } from "./client-providers";
import AuthNav from "@/app/components/AuthNav";
import { UnreadProvider } from "@/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/components/UpdateBanner";
import HydrationBoundary from "@/components/HydrationBoundary";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <UnreadProvider>

        {/* ⭐ AuthNav hydrates AFTER Tailwind CSS loads */}
        <HydrationBoundary>
          <AuthNav />
        </HydrationBoundary>

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
