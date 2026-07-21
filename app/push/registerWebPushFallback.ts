import { urlBase64ToUint8Array } from "./utils";

export async function registerWebPushFallback(userId: string, supabase: any) {
  try {
    console.log("WebPush fallback → starting registration for:", userId);

    // ⭐ MUST come from NEXT_PUBLIC_ env var (client-side)
    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY;

    if (!VAPID_PUBLIC_KEY) {
      console.error("WebPush fallback → ERROR: VAPID public key is missing!");
      return;
    }

    // ⭐ Convert VAPID key to Uint8Array for Chrome
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    // ⭐ Wait for SW to be ready
    const registration = await navigator.serviceWorker.ready;

    // ⭐ Remove old subscription (required for iOS + Chrome consistency)
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      console.log("WebPush fallback → existing subscription found, unsubscribing...");
      await existing.unsubscribe();
    }

    // ⭐ Create NEW WebPush subscription (NOT FCM mobile)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey, // ⭐ THIS is the critical fix
    });

    console.log("WebPush fallback → SUBSCRIPTION SUCCESS:", subscription);

    // ⭐ Save subscription to Supabase
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: userId,
        subscription, // JSON stored exactly as returned by browser
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
