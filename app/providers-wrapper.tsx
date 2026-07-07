"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";

import { ClientProviders } from "./client-providers";
import AuthNavWrapper from "./auth-nav-wrapper";
import { UnreadProvider } from "@/context/UnreadContext";
import SWRegister from "./sw-register";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { supabase } = useSupabase();

  // ⭐ GLOBAL SESSION GUARD
  useEffect(() => {
    async function checkSession() {
      // Prevent stale cached sessions
      await supabase.auth.refreshSession();

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
      }
    }

    checkSession();
  }, [supabase, router]);

  return (
    <ClientProviders>
      <AuthNavWrapper />
      <UnreadProvider>
        <SWRegister />
        {children}
      </UnreadProvider>
    </ClientProviders>
  );
}
