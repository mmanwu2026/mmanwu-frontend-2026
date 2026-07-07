"use client";

import { ClientProviders } from "./client-providers";
import AuthNavWrapper from "./auth-nav-wrapper";
import { UnreadProvider } from "@/context/UnreadContext";
import SWRegister from "./sw-register";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <AuthNavWrapper />
      <UnreadProvider>
        <SWRegister />   {/* ⭐ Add this here */}
        {children}
      </UnreadProvider>
    </ClientProviders>
  );
}
