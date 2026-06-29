import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const postId = body?.post_id;

    if (!postId) {
      console.error("Vision share: missing post_id");
      return NextResponse.json(
        { ok: false, error: "Missing post_id" },
        { status: 400 }
      );
    }

    console.log("Vision share:", postId);

    // ⭐ Optional: future logging into Supabase
    // const supabase = createRouteHandlerClient({ cookies });
    // await supabase.from("vision_share_events").insert({ post_id: postId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Vision share API error:", err);
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
