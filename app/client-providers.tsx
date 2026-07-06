"use client";

import { SupabaseProvider } from "@/context/SupabaseContext";
import { UserProvider } from "@/context/UserContext";
import { UnreadProvider } from "@/context/UnreadContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <UserProvider>
        <UnreadProvider>
          {children}
        </UnreadProvider>
      </UserProvider>
    </SupabaseProvider>
  );
}
