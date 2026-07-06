export async function sendPush(subscription: any, payload: any) {
  await fetch(
    "https://dnhklmhwbkfhbolskqnt.supabase.co/functions/v1/send-push",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription, payload }),
    }
  );
}
