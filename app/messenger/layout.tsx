"use client";

import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import useIncomingCall from "@/hooks/useIncomingCall";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";

import CallListener from "@/components/CallListener";

export default function MessengerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useSupabase();       // ⭐ FIX: useSupabase() now returns the REAL client
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // ⭐ SESSION CHECK (keep this)
  useEffect(() => {
    async function checkSession() {
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
    }
    checkSession();
  }, [supabase, router]);

  // ⭐ LOAD USER ID (keep this)
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const id = session.data.session?.user?.id;
      setUserId(id);
    }
    loadUser();
  }, [supabase]);

  // ⭐ REMOVE PUSH SUBSCRIPTION FROM HERE
  // Push is now handled globally in PushInitializer (app/layout.tsx)
  // MessengerLayout should NOT call registerPush() anymore.

  // ⭐ KEEP BOTH — MessengerChat + MessengerThread rely on them
  useIncomingCall();
  useIncomingCalls();

  return (
    <>
      <CallListener />
      {children}
    </>
  );
}
