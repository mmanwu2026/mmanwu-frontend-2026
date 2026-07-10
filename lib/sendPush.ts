import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function sendPush(
  fcmToken: string,
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

    await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        token: fcmToken,
        title: "Incoming Call",
        body: `${callerName} is calling you`,
        data: {
          room_id: roomId,
          caller_name: callerName,
          url: `/call/${roomId}?role=callee`,
        },
      }),
    });
  } catch (err) {
    console.error("sendPush error:", err);
  }
}
