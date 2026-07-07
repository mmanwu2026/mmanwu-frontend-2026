"use client";

import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import useIncomingCall from "@/hooks/useIncomingCall";

export default function MessengerLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase(); // ⭐ FIXED
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession(); // ⭐ FIXED
      setUserId(session.data.session?.user?.id);
    }
    loadUser();
  }, [supabase]);

  useIncomingCall(userId);

  return <>{children}</>;
}
