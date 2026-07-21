"use client";

import { useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { registerWebPushFallback } from "@/app/push/registerWebPushFallback";

export default function PushInitializer() {
  const { supabase, user } = useSupabase();

useEffect(() => {
  async function init() {
    const session = await supabase.auth.getSession();
    const user = session.data.session?.user;

    if (!user) {
      console.log("PushInitializer → no user yet, waiting...");
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    console.log("PushInitializer → SW ready & controlling page");
    console.log("PushInitializer → registering WebPush fallback for:", user.id);

    await registerWebPushFallback(user.id, supabase);
  }

  init();
}, [supabase]);

  return null;
}
