"use client";

import { ClientProviders } from "./client-providers";
import AuthNav from "@/components/AuthNav";
import { UnreadProvider } from "@/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/components/UpdateBanner";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <UpdateBanner />

      {/* ⭐ AuthNav stays inside providers (Supabase + Unread), 
          but ABOVE scrollable page content */}
      <UnreadProvider>
        <AuthNav />
        <SWRegister />

        {/* ⭐ Page content (scrolls BELOW AuthNav) */}
        {children}
      </UnreadProvider>
    </ClientProviders>
  );
}
