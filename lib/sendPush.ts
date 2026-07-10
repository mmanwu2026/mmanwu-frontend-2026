import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a client ONLY for getting the JWT
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function sendPush(targetUserId: string, payload: any) {
  try {
    // Get the logged-in user's JWT
    const session = await supabase.auth.getSession();
    const jwt = session.data.session?.access_token;

    if (!jwt) {
      console.error("sendPush error: No JWT available");
      return;
    }

    await fetch(
      `${supabaseUrl}/functions/v1/send-push`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,   // ⭐ REQUIRED FIX
        },
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
