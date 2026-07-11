// lib/sendPush.ts

export async function sendPush(
  supabase,
  targetUserId: string,
  roomId: string,
  callerName: string
) {
  try {
    // 1. Get JWT for Edge Function auth
    const session = await supabase.auth.getSession();
    const jwt = session.data.session?.access_token;

    if (!jwt) {
      console.error("sendPush error: No JWT available");
      return;
    }

    // 2. Load push subscription for target user
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

    // -----------------------------------------------------
    // ⭐ CRITICAL FIX:
    // DO NOT SEND `url` IN THE PAYLOAD.
    // The service worker will ALWAYS build:
    //     /call/<roomId>?role=callee
    // -----------------------------------------------------
    const payload = {
      targetUserId,
      subscription: subRow.subscription,
      title: "Incoming Call",
      body: `${callerName} is calling you`,
      data: {
        room_id: roomId,
        caller_name: callerName,
        // ❌ url removed — this was overriding the correct room
        // url: `/call/${roomId}?role=callee`,
      },
    };

    // 3. Call Edge Function
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
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
