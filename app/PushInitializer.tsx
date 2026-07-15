"use client";

import { useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { registerPushToken } from "@/app/push/registerPushToken";
import { registerWebPushFallback } from "@/app/push/registerWebPushFallback";

export default function PushInitializer() {
  const { supabase, user } = useSupabase();

  useEffect(() => {
    if (!user) return;

    async function init() {
      const registration = await navigator.serviceWorker.ready;

      if (!navigator.serviceWorker.controller) {
        console.log("Waiting for SW to control the page...");
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log("PushInitializer → SW ready & controlling page");

      // ⭐ FCM registration
      console.log("PushInitializer → registering FCM token for:", user!.id);
      await registerPushToken(user!.id, supabase);

      // ⭐ WebPush fallback registration
      console.log("PushInitializer → registering WebPush fallback for:", user!.id);
      await registerWebPushFallback(user!.id, supabase);
    }

    init();
  }, [user, supabase]);

  return null;
}
