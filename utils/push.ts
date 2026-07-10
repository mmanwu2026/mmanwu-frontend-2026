// -----------------------------------------------------
// Helper: Convert VAPID key to Uint8Array
// -----------------------------------------------------
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// -----------------------------------------------------
// ⭐ FINAL, PRODUCTION-GRADE PUSH REGISTRATION (iOS-safe)
// -----------------------------------------------------
export async function registerPush(supabase: any) {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) {
    console.warn("iOS Safari detected — skipping registerPush()");
    return;
  }

  // 1. Get logged-in user
  const { data } = await supabase.auth.getSession();
  const authUserId = data.session?.user?.id;

  if (!authUserId) {
    console.warn("registerPush: No authenticated user.");
    return;
  }

  // 2. Wait for service worker
  const registration = await navigator.serviceWorker.ready;

  const vapidPublicKey =
    "BOizG292AOygSGUnDoUYznOVdJ3P-twSH-qEFyXnR8LQWzrYWpghKWzbcEMy83eHQ14yOdxFSUW6ai-jOg6qalk";

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  // 3. Remove stale subscriptions
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    try {
      await existing.unsubscribe();
      console.log("Old push subscription removed.");
    } catch (err) {
      console.error("Failed to remove old subscription:", err);
    }
  }

  // 4. Create new subscription
  let newSubscription: PushSubscription | null = null;

  try {
    newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return;
  }

  if (!newSubscription) {
    console.error("Failed to create new push subscription.");
    return;
  }

  // ⭐ Extract FCM token (endpoint)
  const fcmToken = newSubscription.endpoint;

  // 5. Save subscription (optional)
  await supabase.from("push_subscriptions").upsert({
    user_id: authUserId,
    subscription: newSubscription.toJSON(),
  });

  // ⭐⭐⭐ 6. SAVE FCM TOKEN INTO profiles TABLE ⭐⭐⭐
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ fcm_token: fcmToken })
    .eq("id", authUserId);

  if (profileErr) {
    console.error("Failed to save fcm_token into profiles:", profileErr);
  } else {
    console.log("FCM token saved into profiles for user:", authUserId);
  }
}
