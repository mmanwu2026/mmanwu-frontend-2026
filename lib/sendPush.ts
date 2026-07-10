// lib/sendPush.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function sendPush(
  targetUserId: string,
  roomId: string,
  callerName: string
) {
  try {
    // 1. Get JWT for authenticated Edge Function call
    const session = await supabase.auth.getSession();
    const jwt = session.data.session?.access_token;

    if (!jwt) {
      console.error("sendPush error: No JWT available");
      return;
    }

    // 2. Load saved Web Push subscription for the target user
    const { data: subRow, error: subError } = await supabase
      .from("push_subscriptions") // <-- adjust to your actual table name
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

    // 3. Call Edge Function with correct payload shape
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
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
          room_id: roomId,
          caller_name: callerName,
          url: `/call/${roomId}?role=callee`,
        },
      }),
    });

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
