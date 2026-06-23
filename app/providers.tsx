"use client";

import { UserProvider } from "@/context/UserContext";
import { SupabaseProvider } from "@/context/SupabaseContext";
import AuthNavWrapper from "@/components/AuthNavWrapper";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <UserProvider>
        <AuthNavWrapper />   {/* ← MUST be inside UserProvider */}
        {children}
      </UserProvider>
    </SupabaseProvider>
  );
}
