"use client";

import { ClientProviders } from "./client-providers";
import AuthNav from "@/components/AuthNav";
import { UnreadProvider } from "@/context/UnreadContext";
import SWRegister from "./sw-register";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <AuthNav />
      <UnreadProvider>
        <SWRegister />
        {children}
      </UnreadProvider>
    </ClientProviders>
  );
}
