"use client";

import { ClientProviders } from "./client-providers";
import AuthNav from "@/components/AuthNav";
import { UnreadProvider } from "@/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/components/UpdateBanner";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      {/* ⭐ REMOVE flex layout — allow viewport to be the scroll container */}
      <UpdateBanner />
      <AuthNav />

      <UnreadProvider>
        <SWRegister />

        {/* ⭐ Children render directly — no flex, no height constraints */}
        {children}
      </UnreadProvider>
    </ClientProviders>
  );
}
