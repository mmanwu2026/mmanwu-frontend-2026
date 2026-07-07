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
// SAFARI-SAFE PUSH SUBSCRIPTION
// -----------------------------------------------------
export async function registerPush(userId: string, supabase: any) {
  const registration = await navigator.serviceWorker.ready;

  const vapidPublicKey =
    "BALg6s-s9f1Y7SR6AeTsD78C1cMamfe7As7OeWLjHhXp-fVjUz6qj3jx9QFZvzv3xp_YLZklxUt-zIXnJTwJBCw";

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  // Check if already subscribed
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  // SAFE: subscription only happens after user gesture
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  // Store subscription in Supabase
  await supabase.from("push_subscriptions").upsert({
    user_id: userId,
    subscription,
  });

  return subscription;
}

