"use client";

import { useEffect } from "react";
import { registerPush } from "@/utils/push";
import { useSupabase } from "@/context/SupabaseContext";

export default function PushInitializer() {
  const { supabase } = useSupabase(); // ⭐ FIX: your project uses destructuring

  useEffect(() => {
    const enabled = localStorage.getItem("notifications_enabled");

    if (enabled === "true") {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          registerPush(supabase);
        }
      });
    }
  }, [supabase]);

  return null;
}
