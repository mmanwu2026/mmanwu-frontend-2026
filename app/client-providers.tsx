"use client";

import { SupabaseProvider } from "@/context/SupabaseContext";
import { UserProvider } from "@/context/UserContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </SupabaseProvider>
  );
}
