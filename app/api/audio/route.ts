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

    // Generate signed URL
    const { data, error } = await supabase.storage
      .from("sound_files")
      .createSignedUrl(file, 60 * 60);

    if (error || !data?.signedUrl) {
      console.error("Signed URL error:", error);
      return new NextResponse("Failed to generate signed URL", { status: 400 });
    }

    // Fetch the actual audio file
    const audioRes = await fetch(data.signedUrl);

    if (!audioRes.ok || !audioRes.body) {
      return new NextResponse("Failed to fetch audio file", {
        status: audioRes.status,
      });
    }

    // Determine MIME type
    const ext = file.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === "wav") contentType = "audio/wav";
    if (ext === "mp3") contentType = "audio/mpeg";
    if (ext === "ogg") contentType = "audio/ogg";
    if (ext === "flac") contentType = "audio/flac";
    if (ext === "m4a") contentType = "audio/mp4";

    // ⭐ CRITICAL FIX: Stream the audio with proper CORS headers
    return new NextResponse(audioRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Expose-Headers": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    });
  } catch (err) {
    console.error("Proxy error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
