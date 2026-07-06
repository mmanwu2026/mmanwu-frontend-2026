"use client";

import { ClientProviders } from "./client-providers";
import AuthNavWrapper from "./auth-nav-wrapper";
import { UnreadProvider } from "@/context/UnreadContext";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <AuthNavWrapper />
      <UnreadProvider>
        {children}
      </UnreadProvider>
    </ClientProviders>
  );
}
