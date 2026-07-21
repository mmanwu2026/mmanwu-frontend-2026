import { urlBase64ToUint8Array } from "./utils";
import vapid from "./vapid.json"; // ⭐ Load VAPID key statically

export async function registerWebPushFallback(userId: string, supabase: any) {

  console.log("WebPush fallback → VERSION 8 LOADED");

  try {
    console.log("WebPush fallback → starting registration for:", userId);

    // ⭐ GUARANTEED VAPID KEY (no process.env)
    const VAPID_PUBLIC_KEY = vapid.publicKey;
    console.log("WebPush fallback → VAPID key:", VAPID_PUBLIC_KEY);

    if (!VAPID_PUBLIC_KEY) {
      console.error("WebPush fallback → ERROR: VAPID public key missing!");
      return;
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const registration = await navigator.serviceWorker.ready;

    // Remove existing browser subscription
    const existingBrowserSub = await registration.pushManager.getSubscription();
    if (existingBrowserSub) {
      console.log("WebPush fallback → unsubscribing browser subscription...");
      await existingBrowserSub.unsubscribe();
    }

    // Delete old row (returning rows for debug)
    const { data: deletedRows, error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .select();

    console.log("WebPush fallback → DELETE RESULT:", { deletedRows, deleteError });

    // ⭐ Create REAL WebPush subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    console.log("WebPush fallback → SUBSCRIPTION SUCCESS:", subscription);

    // Insert new row
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
