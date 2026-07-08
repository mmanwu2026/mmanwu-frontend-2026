// -----------------------------------------------------
// Helper: Convert VAPID key to Uint8Array (required)
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
// EDGE-SAFE PUSH SUBSCRIPTION (Corrected)
// -----------------------------------------------------
export async function registerPush(supabase: any) {
  // ⭐ Always load the REAL logged-in user
  const { data } = await supabase.auth.getSession();
  const authUserId = data.session?.user?.id;

  if (!authUserId) {
    console.warn("registerPush: No authenticated user.");
    return;
  }

  navigator.serviceWorker.ready.then((registration) => {
    const vapidPublicKey =
      "BOizG292AOygSGUnDoUYznOVdJ3P-twSH-qEFyXnR8LQWzrYWpghKWzbcEMy83eHQ14yOdxFSUW6ai-jOg6qalk";

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // Check existing subscription synchronously
    registration.pushManager.getSubscription().then((existing) => {
      if (existing) return existing;

      // MUST be synchronous
      registration.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })
        .then(async (subscription) => {
          // ⭐ Correct: store subscription for the LOGGED-IN user only
          const { error } = await supabase
            .from("push_subscriptions")
            .upsert({
              user_id: authUserId,
              subscription,
            });

          if (error) {
            console.error("Supabase push_subscriptions upsert error:", error);
          }
        })
        .catch((err) => {
          console.error("Subscribe error:", err);
        });
    });
  });
}
