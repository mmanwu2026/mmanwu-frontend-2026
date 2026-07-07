"use client";

import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useIncomingCall from "@/hooks/useIncomingCall";
import { registerPush } from "@/utils/push"; // ⭐ your helper

export default function MessengerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // ⭐ Session guard
  useEffect(() => {
    async function checkSession() {
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
    }
    checkSession();
  }, [supabase, router]);

  // ⭐ Load user ID
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const id = session.data.session?.user?.id;
      setUserId(id);
    }
    loadUser();
  }, [supabase]);

  // ⭐ Push subscription
  useEffect(() => {
    if (!userId) return;
    registerPush(userId, supabase);
  }, [userId, supabase]);

  useIncomingCall(userId);

  return <>{children}</>;
}
