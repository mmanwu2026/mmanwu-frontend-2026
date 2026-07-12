"use client";

import { useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function ensurePushSubscription(supabase: any, userId: string) {
  try {
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidKey = urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      );

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

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
          ensurePushSubscription(supabase, user.id);
        }
      });
    }
  }, [supabase]);

  return null;
}
