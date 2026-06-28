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

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ⭐ 1️⃣ Fetch current share_count
  const { data: postData, error: fetchError } = await supabase
    .from("sound_posts")
    .select("share_count")
    .eq("id", post_id)
    .single();

  if (fetchError || !postData) {
    console.error(fetchError);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }

  const newCount = (postData.share_count ?? 0) + 1;

  // ⭐ 2️⃣ Update share_count
  const { error: updateError } = await supabase
    .from("sound_posts")
    .update({ share_count: newCount })
    .eq("id", post_id);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ error: "Failed to update share count" }, { status: 500 });
  }

  // ⭐ 3️⃣ Insert share event (optional)
  await supabase.from("sound_post_shares").insert({
    post_id,
    user_id: user.id,
  });

  return NextResponse.json({ success: true });
}
