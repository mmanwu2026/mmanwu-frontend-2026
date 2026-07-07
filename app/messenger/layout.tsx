"use client";

import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useIncomingCall from "@/hooks/useIncomingCall";

export default function MessengerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // ⭐ GLOBAL SESSION GUARD (client-only)
  useEffect(() => {
    async function checkSession() {
      await supabase.auth.refreshSession(); // avoid stale cached session
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }
    }

    checkSession();
  }, [supabase, router]);

  // ⭐ Load user ID for incoming call listener
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id);
    }
    loadUser();
  }, [supabase]);

  useIncomingCall(userId);

  return <>{children}</>;
}
