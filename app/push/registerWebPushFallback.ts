import { urlBase64ToUint8Array } from "./utils";

export async function registerWebPushFallback(userId: string, supabase: any) {

  // ⭐ THIS IS THE EXACT SPOT — FIRST LINE INSIDE THE FUNCTION
  console.log("WebPush fallback → VERSION 7 LOADED");

  try {
    console.log("WebPush fallback → starting registration for:", userId);

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY;
    if (!VAPID_PUBLIC_KEY) {
      console.error("WebPush fallback → ERROR: VAPID public key is missing!");
      return;
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const registration = await navigator.serviceWorker.ready;

    const existingBrowserSub = await registration.pushManager.getSubscription();
    if (existingBrowserSub) {
      console.log("WebPush fallback → unsubscribing browser subscription...");
      await existingBrowserSub.unsubscribe();
    }

    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    console.log("WebPush fallback → SUBSCRIPTION SUCCESS:", subscription);

    const { error } = await supabase
      .from("push_subscriptions")
      .insert({
        user_id: userId,
        subscription,
      });

    if (error) {
      console.error("WebPush fallback → Supabase insert failed:", error);
      return;
    }

    console.log("WebPush fallback → subscription saved for:", userId);

  } catch (err) {
    console.error("WebPush fallback registration failed:", err);
  }
}
