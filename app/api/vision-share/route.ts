import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const postId = body?.post_id;
    const maskTier = body?.maskTier ?? 4; // default share = uplifting
    const postType = body?.post_type ?? "vision";

    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "Missing post_id" },
        { status: 400 }
      );
    }

    // ⭐ Correct: cookies() must be awaited
    const cookieStore = await cookies();

    // ⭐ Extract JWT manually
    const accessToken = cookieStore.get("sb-access-token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // ⭐ Correct Supabase client for server routes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    // ⭐ Authenticate using JWT
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // ⭐ Insert share as a reaction
    const { error } = await supabase.from("reactions").insert({
      post_id: postId,
      post_type: postType,
      maskTier,
      user_id: user.id,
    });

    if (error) {
      console.error("Share insert error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to log share" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Vision share API error:", err);
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
