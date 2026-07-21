"use client";

import { useEffect, useRef } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { registerWebPushFallback } from "@/app/push/registerWebPushFallback";

export default function PushInitializer() {
  const { supabase } = useSupabase();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    let unsubscribe: any;

    async function init() {
      console.log("PushInitializer → loading Supabase session");

      // 1. Wait for Supabase to attach the authenticated session to the client
      unsubscribe = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!session) {
          console.log("PushInitializer → no authenticated session yet, waiting...");
          return;
        }

        const user = session.user;
        console.log("PushInitializer → authenticated user:", user.id);

        // 2. Strict Mode protection
        if (hasInitializedRef.current) {
          console.log("PushInitializer → already initialized, skipping subscription");
          return;
        }
        hasInitializedRef.current = true;

        // 3. Wait for SW to be ready AND controlling the page
        const registration = await navigator.serviceWorker.ready;

        if (!navigator.serviceWorker.controller) {
          console.log("PushInitializer → SW not controlling page yet, waiting...");
          return;
        }

        console.log("PushInitializer → SW ready & controlling page");

        // 4. Register fallback (now safe: authenticated + SW ready + client JWT attached)
        console.log("PushInitializer → registering WebPush fallback for:", user.id);
        await registerWebPushFallback(user.id, supabase);
      });
    }

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [supabase]);

  return null;
}
