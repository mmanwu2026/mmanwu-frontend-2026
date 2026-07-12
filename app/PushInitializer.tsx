"use client";

import { useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";

// ⭐ One-time subscription helper
async function ensurePushSubscription(supabase: any, userId: string) {
  try {
    const registration = await navigator.serviceWorker.ready;

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Store subscription ONCE
      await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        subscription,
      });

      console.log("PUSH INIT DEBUG → new subscription created");
    } else {
      console.log("PUSH INIT DEBUG → existing subscription reused");
    }
  } catch (err) {
    console.error("PUSH INIT DEBUG → subscription error:", err);
  }
}

export default function PushInitializer() {
  const { supabase } = useSupabase();

  useEffect(() => {
    const enabled = localStorage.getItem("notifications_enabled");

    if (enabled === "true") {
      supabase.auth.getSession().then(({ data }) => {
        const user = data.session?.user;

        if (user) {
          console.log("PUSH INIT DEBUG → initializing push for user:", user.id);
          ensurePushSubscription(supabase, user.id);
        }
      });
    }
  }, [supabase]);

  return null;
}
