// lib/sendPush.ts

export async function sendPush(
  supabase,
  targetUserId: string,
  roomId: string,
  callerName: string
) {
  try {
    const session = await supabase.auth.getSession();
    const jwt = session.data.session?.access_token;

    if (!jwt) {
      console.error("sendPush error: No JWT available");
      return;
    }

    const { data: subRow, error: subError } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", targetUserId)
      .single();

    if (subError) {
      console.error("sendPush error: Failed to load subscription:", subError);
      return;
    }

    if (!subRow?.subscription) {
      console.error(
        "sendPush error: No subscription found for target user:",
        targetUserId
      );
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          targetUserId,
          subscription: subRow.subscription,
          title: "Incoming Call",
          body: `${callerName} is calling you`,
          data: {
            event_type: "incoming_call",      // ⭐ tag this as incoming_call
            room_id: roomId,
            caller_name: callerName,
            url: `/call/${roomId}?role=callee`,
          },
        }),
      }
    );

    if (!res.ok) {
      console.error(
        "sendPush error: Edge Function returned non-OK status",
        res.status,
        await res.text()
      );
    }
  } catch (err) {
    console.error("sendPush error:", err);
  }
}
