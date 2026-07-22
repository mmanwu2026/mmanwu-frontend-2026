"use client";

import { useEffect, useRef } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { registerWebPushFallback } from "@/app/push/registerWebPushFallback";

export default function PushInitializer() {
  const { supabase } = useSupabase();
  const hasInitializedRef = useRef(false);
  const authSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    async function init() {
      console.log("PushInitializer → loading Supabase session");

      // ⭐ Correct Supabase v2 API
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!session) {
          console.log("PushInitializer → no authenticated session yet, waiting...");
          return;
        }

        const user = session.user;
        console.log("PushInitializer → authenticated user:", user.id);

        // ⭐ Strict Mode protection
        if (hasInitializedRef.current) {
          console.log("PushInitializer → already initialized, skipping subscription");
          return;
        }
        hasInitializedRef.current = true;

        // ⭐ Wait for SW to be ready
        const registration = await navigator.serviceWorker.ready;

        if (!navigator.serviceWorker.controller) {
          console.log("PushInitializer → SW not controlling page yet, waiting...");
          return;
        }

        console.log("PushInitializer → SW ready & controlling page");

        // ⭐ Register fallback safely
        console.log("PushInitializer → registering WebPush fallback for:", user.id);
        await registerWebPushFallback(user.id, supabase);
      });

      // ⭐ Store subscription for cleanup
      authSubscriptionRef.current = subscription;
    }

    init();

    return () => {
      // ⭐ Correct cleanup
      if (authSubscriptionRef.current) {
        console.log("PushInitializer → cleaning up auth subscription");
        authSubscriptionRef.current.unsubscribe();
      }
    };
  }, [supabase]);

  return null;
}
