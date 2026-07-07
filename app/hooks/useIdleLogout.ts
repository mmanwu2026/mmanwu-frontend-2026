"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";

export default function useIdleLogout(timeoutMs = 30 * 60 * 1000) {
  const router = useRouter();
  const { supabase } = useSupabase(); // ⭐ FIXED

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);

      timer = setTimeout(async () => {
        const session = await supabase.auth.getSession(); // ⭐ FIXED

        if (!session.data.session) {
          await supabase.auth.signOut(); // ⭐ FIXED
          router.push("/login");
        }
      }, timeoutMs);
    };

    const events = ["mousemove", "keydown", "touchstart", "scroll"];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      clearTimeout(timer);
    };
  }, [supabase, router, timeoutMs]);
}
