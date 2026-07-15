import { urlBase64ToUint8Array } from "./utils";

export async function registerWebPushFallback(userId: string, supabase: any) {
  try {
    console.log("WebPush fallback → starting registration for:", userId);

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY;

    if (!VAPID_PUBLIC_KEY) {
      console.error("WebPush fallback → ERROR: VAPID public key is missing!");
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    // ⭐ Check for existing subscription (iOS requires unsubscribe before resubscribe)
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      console.log("WebPush fallback → existing subscription found, unsubscribing...");
      await existing.unsubscribe();
    }

    // ⭐ Create new subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    console.log("WebPush fallback → SUBSCRIPTION SUCCESS:", subscription);

    // ⭐ Save subscription to Supabase
    const { error } = await supabase
      .from("user_push_tokens")
      .upsert({
        user_id: userId,
        webpush_subscription: subscription,
      });

    if (error) {
      console.error("WebPush fallback → Supabase upsert failed:", error);
      return;
    }

    console.log("WebPush fallback → subscription saved for:", userId);

  } catch (err) {
    console.error("WebPush fallback registration failed:", err);
  }
}
