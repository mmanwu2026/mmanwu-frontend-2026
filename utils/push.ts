// -----------------------------------------------------
// Helper: Convert VAPID key to Uint8Array (browser requirement)
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
// ⭐ FINAL, PRODUCTION-GRADE WEB PUSH REGISTRATION
// -----------------------------------------------------
export async function registerPush(supabase: any) {
  // iOS Safari cannot reliably support Web Push yet
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

  // ⭐ Your VAPID public key from VapidKeys.com (base64url)
  const vapidPublicKey =
    "BDNPqc4kWGDonyPdj8HUAH5wpev5Z4jfKlisFx6rcxvptutlxyx3eS_Pt6cguKcfA5_9x_7vTJFsMx8bO2bQdFk";

  // Convert to Uint8Array (browser requirement)
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  // 3. Check existing subscription
  const existing = await registration.pushManager.getSubscription();

  if (existing) {
    try {
      const existingKeyBuffer = existing.options?.applicationServerKey;

      if (existingKeyBuffer) {
        // Convert ArrayBuffer → Uint8Array
        const existingKey = new Uint8Array(existingKeyBuffer);

        // Compare keys
        const keyMatches =
          existingKey.length === applicationServerKey.length &&
          existingKey.every((v, i) => v === applicationServerKey[i]);

        if (keyMatches) {
          // Save existing subscription to Supabase
          await supabase
            .from("push_subscriptions")
            .upsert(
              {
                user_id: authUserId,
                subscription: existing.toJSON(),
              },
              { onConflict: "user_id" }
            );

          console.log("Existing push subscription validated & saved.");
          return;
        }

        // Otherwise unsubscribe and recreate
        await existing.unsubscribe();
        console.log("Old push subscription removed.");
      }
    } catch (err) {
      console.error("Failed to validate/remove existing subscription:", err);
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

  // 5. Save subscription JSON into Supabase
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: authUserId,
        subscription: newSubscription.toJSON(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("Supabase push_subscriptions upsert error:", error);
  } else {
    console.log("Web Push subscription saved for user:", authUserId);
  }
}
