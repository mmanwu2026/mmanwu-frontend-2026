import { urlBase64ToUint8Array } from "./utils";

export async function registerWebPushFallback(userId: string, supabase: any) {
  try {
    console.log("WebPush fallback → starting registration for:", userId);

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY;
    if (!VAPID_PUBLIC_KEY) {
      console.error("WebPush fallback → ERROR: VAPID public key is missing!");
      return;
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const registration = await navigator.serviceWorker.ready;

    // Remove browser subscription
    const existingBrowserSub = await registration.pushManager.getSubscription();
    if (existingBrowserSub) {
      console.log("WebPush fallback → unsubscribing browser subscription...");
      await existingBrowserSub.unsubscribe();
    }

    // ⭐ Remove Supabase row FIRST
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId);

    // Create new WebPush subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    console.log("WebPush fallback → SUBSCRIPTION SUCCESS:", subscription);

    // Insert new row (no conflict now)
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
