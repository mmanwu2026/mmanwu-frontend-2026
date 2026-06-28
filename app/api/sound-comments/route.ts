import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// ⭐ POST — Create a new Gatekeeper-approved comment
export async function POST(req: Request) {
  const cookieStore = await cookies(); // ⭐ FIXED — cookies() is async

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

  const body = await req.json();
  const { post_id, raw_input, final_text, automask, positivity_ratio } = body;

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Insert comment
  const { error } = await supabase.from("sound_post_comments").insert({
    post_id,
    user_id: user.id,
    raw_input,
    content: final_text,
    automask,
    positivity_ratio,
  });

  if (error) {
    console.error("Comment insert error:", error);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ⭐ GET — Load comments for a sound post
export async function GET(req: Request) {
  const cookieStore = await cookies(); // ⭐ FIXED — cookies() is async

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

  const { searchParams } = new URL(req.url);
  const post_id = searchParams.get("post_id");

  if (!post_id) {
    return NextResponse.json({ comments: [] }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sound_post_comments")
    .select(
      `
      id,
      content,
      created_at,
      user_id,
      users:user_id ( username )
    `
    )
    .eq("post_id", post_id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Comment load error:", error);
    return NextResponse.json({ comments: [] }, { status: 500 });
  }

  const mapped = (data || []).map((c: any) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    user_id: c.user_id,
    username: c.users?.username ?? "Unknown",
  }));

  return NextResponse.json({ comments: mapped });
}
