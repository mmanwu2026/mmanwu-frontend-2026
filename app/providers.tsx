"use client";

import { UserProvider } from "@/context/UserContext";
import { SupabaseProvider } from "@/context/SupabaseContext";
import AuthNav from "@/components/AuthNav";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <UserProvider>
        <AuthNav />
        {children}
      </UserProvider>
    </SupabaseProvider>
  );
}
