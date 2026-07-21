"use client";

import { SupabaseProvider } from "@/app/context/SupabaseContext";
import { IdentityProvider } from "@/app/context/IdentityContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <IdentityProvider>
        {children}
      </IdentityProvider>
    </SupabaseProvider>
  );
}
