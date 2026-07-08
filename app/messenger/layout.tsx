"use client";

import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import { registerPush } from "@/utils/push";

export default function MessengerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Ensure session is valid
  useEffect(() => {
    async function checkSession() {
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
    }
    checkSession();
  }, [supabase, router]);

  // Load user ID
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const id = session.data.session?.user?.id;
      setUserId(id);
    }
    loadUser();
  }, [supabase]);

  // ⭐ SAFE iOS DETECTION — prevents PWA crash
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // ⭐ Push registration — now SAFE and NON‑BLOCKING
  useEffect(() => {
    if (!userId) return;

    if (isIOS) {
      console.warn("Push disabled on iOS Safari — skipping registerPush()");
      return;
    }

    registerPush(supabase).catch((err) => {
      console.warn("Push registration failed (non-blocking):", err);
    });
  }, [userId, supabase, isIOS]);

  // ⭐ Incoming call UI ALWAYS runs — even if push is blocked
  useIncomingCalls();

  return <>{children}</>;
}
