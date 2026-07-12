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
      <AuthNav />
      <UnreadProvider>
        <SWRegister />
        {children}
      </UnreadProvider>
    </ClientProviders>
  );
}
