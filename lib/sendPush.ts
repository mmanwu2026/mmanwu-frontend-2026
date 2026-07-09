export async function sendPush(targetUserId: string, payload: any) {
  try {
    await fetch(
      "https://dnhklmhwbkfhbolskqnt.supabase.co/functions/v1/send-push",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          payload,
        }),
      }
    );
  } catch (err) {
    console.error("sendPush error:", err);
  }
}
