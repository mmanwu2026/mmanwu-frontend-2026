"use client";

import { useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { registerPushToken } from "@/app/push/registerPushToken";

export default function PushInitializer() {
  const { supabase, user } = useSupabase();

  useEffect(() => {
    if (!user) return;

    async function init() {
      // ⭐ Wait for SW to be fully ready
      const registration = await navigator.serviceWorker.ready;

      // ⭐ Wait until SW is actually controlling the page
      if (!navigator.serviceWorker.controller) {
        console.log("Waiting for SW to control the page...");
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log("PushInitializer → SW ready & controlling page");
      console.log("PushInitializer → registering FCM token for:", user!.id);

      registerPushToken(user!.id, supabase);
    }

    init();
  }, [user, supabase]);

  return null;
}
