import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file");

    if (!file) {
      return new NextResponse("Missing file parameter", { status: 400 });
    }

    // Create Supabase client (server-side)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate signed URL properly
    const { data, error } = await supabase.storage
      .from("sound_files")
      .createSignedUrl(file, 60 * 60); // 1 hour

    if (error || !data?.signedUrl) {
      console.error("Signed URL error:", error);
      return new NextResponse("Failed to generate signed URL", { status: 400 });
    }

    // Fetch the actual audio file
    const audioRes = await fetch(data.signedUrl);

    if (!audioRes.ok) {
      return new NextResponse("Failed to fetch audio file", {
        status: audioRes.status,
      });
    }

    // Add CORS headers so Web Audio API can extract PCM
    const headers = new Headers(audioRes.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Headers", "*");
    headers.set("Access-Control-Expose-Headers", "*");

    return new NextResponse(audioRes.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("Proxy error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
