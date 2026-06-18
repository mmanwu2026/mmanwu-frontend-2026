import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { user_id, content } = await req.json();

    if (!user_id || !content) {
      return NextResponse.json(
        { error: "Missing user_id or content" },
        { status: 400 }
      );
    }

    // 1️⃣ Save raw post immediately
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert([{ user_id, content, status: "raw" }])
      .select()
      .single();

    if (postError) {
      console.error("Post creation error:", postError);
      return NextResponse.json(
        { error: "Failed to create post" },
        { status: 500 }
      );
    }

    // 2️⃣ Insert job into Gatekeeper queue
    const { error: jobError } = await supabase
      .from("gatekeeper_jobs")
      .insert([{ post_id: post.id, status: "pending" }]);

    if (jobError) {
      console.error("Queue insert error:", jobError);
      return NextResponse.json(
        { error: "Failed to enqueue Gatekeeper job" },
        { status: 500 }
      );
    }

    // 3️⃣ Return success immediately — NO AI CALL HERE
    return NextResponse.json({
      message: "Post created and queued for Gatekeeper processing",
      post_id: post.id,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
