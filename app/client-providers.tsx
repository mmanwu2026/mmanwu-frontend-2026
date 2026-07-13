"use client";

import { SupabaseProvider } from "@/app/context/SupabaseContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      {children}
    </SupabaseProvider>
  );
}
