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
// EDGE-SAFE PUSH SUBSCRIPTION
// -----------------------------------------------------
export function registerPush(userId: string, supabase: any) {
  // MUST be called directly inside the click handler
  navigator.serviceWorker.ready.then((registration) => {
    const vapidPublicKey =
      "BOizG292AOygSGUnDoUYznOVdJ3P-twSH-qEFyXnR8LQWzrYWpghKWzbcEMy83eHQ14yOdxFSUW6ai-jOg6qalk";

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // Check existing subscription synchronously
    registration.pushManager.getSubscription().then((existing) => {
      if (existing) return existing;

      // *** CRITICAL ***
      // subscribe() MUST happen in this synchronous chain
      registration.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })
        .then((subscription) => {
          // AFTER subscription succeeds, async work is allowed
          supabase.from("push_subscriptions").upsert({
            user_id: userId,
            subscription,
          });
        })
        .catch((err) => {
          console.error("Subscribe error:", err);
        });
    });
  });
}
