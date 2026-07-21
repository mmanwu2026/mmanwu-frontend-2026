"use client";

import { useEffect, useRef } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { registerWebPushFallback } from "@/app/push/registerWebPushFallback";

export default function PushInitializer() {
  const { supabase } = useSupabase();

  // Prevent double-run in React Strict Mode
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    async function init() {
      console.log("PushInitializer → loading Supabase session");

      // 1. Wait for full authenticated session (NOT just userId)
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        console.log("PushInitializer → no authenticated session yet, waiting...");
        return;
      }

      const user = session.user;
      console.log("PushInitializer → authenticated user:", user.id);

      // 2. Strict Mode protection — run only once
      if (hasInitializedRef.current) {
        console.log("PushInitializer → already initialized, skipping subscription");
        return;
      }
      hasInitializedRef.current = true;

      // 3. Wait for Service Worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // 4. Ensure SW is controlling the page
      if (!navigator.serviceWorker.controller) {
        console.log("PushInitializer → SW not controlling page yet, waiting...");
        return;
      }

      console.log("PushInitializer → SW ready & controlling page");

      // 5. Register WebPush fallback (now safe: authenticated + SW ready)
      console.log("PushInitializer → registering WebPush fallback for:", user.id);
      await registerWebPushFallback(user.id, supabase);
    }

    init();
  }, [supabase]);

  return null;
}
