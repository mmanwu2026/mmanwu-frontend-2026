"use client";

import { getMessagingSafe } from "@/lib/firebaseClient";
import { getToken } from "firebase/messaging";

export async function registerPushToken(userId: string, supabase: any) {
  const messaging = await getMessagingSafe();
  if (!messaging) {
    console.log("Firebase Messaging not supported");
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  try {
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.log("No FCM token generated");
      return;
    }

    await supabase.from("user_push_tokens").upsert({
      user_id: userId,
      fcm_token: token,
    });

    console.log("FCM token saved:", token);
  } catch (e) {
    console.log("Push token registration failed", e);
  }
}
