"use client";

import { useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { registerWebPushFallback } from "@/app/push/registerWebPushFallback";

export default function PushInitializer() {
  const { supabase, user } = useSupabase();

  useEffect(() => {
    if (!user) return;

    async function init() {
      // Wait for SW to be ready
      const registration = await navigator.serviceWorker.ready;

      // Ensure SW is controlling the page
      if (!navigator.serviceWorker.controller) {
        console.log("Waiting for SW to control the page...");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log("PushInitializer → SW ready & controlling page");

      // ⭐ REMOVE FCM REGISTRATION COMPLETELY
      // (This was the source of FCM endpoints + 410 errors)
      // await registerPushToken(user!.id, supabase);  ❌ REMOVE

      // ⭐ Register WebPush fallback ONLY
      console.log("PushInitializer → registering WebPush fallback for:", user!.id);
      await registerWebPushFallback(user!.id, supabase);
    }

    init();
  }, [user, supabase]);

  return null;
}
