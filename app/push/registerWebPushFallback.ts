// app/push/registerWebPushFallback.ts

import { SupabaseClient } from "@supabase/supabase-js";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY!;

// Convert base64 → Uint8Array (required by PushManager)
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerWebPushFallback(
  userId: string,
  supabase: SupabaseClient
) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!("PushManager" in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to WebPush using VAPID
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    console.log("WebPush fallback subscription created:", subscription);

    // Save subscription to Supabase
    const { error } = await supabase.from("user_push_tokens").upsert({
      user_id: userId,
      webpush_subscription: subscription,
    });

    if (error) {
      console.error("Failed to save WebPush subscription:", error);
    } else {
      console.log("WebPush fallback subscription saved for:", userId);
    }
  } catch (err) {
    console.error("WebPush fallback registration failed:", err);
  }
}
