"use client";

import { ClientProviders } from "./client-providers";
import AuthNav from "@/components/AuthNav";
import { UnreadProvider } from "@/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/components/UpdateBanner";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      {/* Global banner */}
      <UpdateBanner />

      {/* AuthNav now handles navigation to /composer */}
      <AuthNav />

      <UnreadProvider>
        <SWRegister />

        {/* Page content */}
        {children}
      </UnreadProvider>
    </ClientProviders>
  );
}
