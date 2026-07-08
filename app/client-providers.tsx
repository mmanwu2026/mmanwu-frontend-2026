"use client";

import { SupabaseProvider } from "@/context/SupabaseContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      {children}
    </SupabaseProvider>
  );
}
