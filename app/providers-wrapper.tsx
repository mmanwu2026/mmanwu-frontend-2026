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

  // ⭐ Prevent running during Next.js prerender
  if (typeof window === "undefined") {
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

  // ⭐ GLOBAL SESSION GUARD (client-only)
  useEffect(() => {
    async function checkSession() {
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
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
