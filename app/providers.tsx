"use client";

import { UserProvider } from "@/context/UserContext";
import { SupabaseProvider } from "@/context/SupabaseContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </SupabaseProvider>
  );
}
