"use client";

import { useEffect, useRef } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
// import { registerWebPushFallback } from "@/app/push/registerWebPushFallback"; 
// ⭐ Fallback temporarily disabled

export default function PushInitializer() {
  const { supabase } = useSupabase();
  const hasInitializedRef = useRef(false);
  const authSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    async function init() {
      console.log("PushInitializer → loading Supabase session");

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
          console.log("PushInitializer → already initialized, skipping");
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

        // ⭐ TEMPORARILY DISABLED: prevents double push
        console.log("PushInitializer → WebPush fallback disabled to prevent duplicate notifications");
        // await registerWebPushFallback(user.id, supabase);
      });

      authSubscriptionRef.current = subscription;
    }

    init();

    return () => {
      if (authSubscriptionRef.current) {
        console.log("PushInitializer → cleaning up auth subscription");
        authSubscriptionRef.current.unsubscribe();
      }
    };
  }, [supabase]);

  return null;
}
