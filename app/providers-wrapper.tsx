"use client";

import { ClientProviders } from "./client-providers";
import AuthNavWrapper from "./auth-nav-wrapper";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <AuthNavWrapper />
      {children}
    </ClientProviders>
  );
}
