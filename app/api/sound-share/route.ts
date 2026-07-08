import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { post_id } = await req.json();

  if (!post_id) {
    return NextResponse.json({ error: "Missing post_id" }, { status: 400 });
  }

  // ⭐ Extract JWT manually
  const accessToken = cookieStore.get("sb-access-token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ⭐ Authenticate using JWT
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ⭐ Prevent duplicate shares
  const { data: existingShare } = await supabase
    .from("sound_post_shares")
    .select("id")
    .eq("post_id", post_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingShare) {
    await supabase.from("sound_post_shares").insert({
      post_id,
      user_id: user.id,
      post_type: "sound",
    });
  }

  return NextResponse.json({ success: true });
}
