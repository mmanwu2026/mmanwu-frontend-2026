"use client";

import { UserProvider } from "@/context/UserContext";
import { SupabaseProvider } from "@/context/SupabaseContext";
import AuthNav from "@/components/AuthNav";
import { useUser } from "@/context/UserContext";

function AuthNavWrapper() {
  const { loading } = useUser();

  // ⭐ Do NOT render AuthNav until the user session is loaded
  if (loading) return null;

  return <AuthNav />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <UserProvider>
        {children}
        <AuthNavWrapper />
      </UserProvider>
    </SupabaseProvider>
  );
}
