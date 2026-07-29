import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file");

    if (!file) {
      return new NextResponse("Missing file parameter", { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.storage
      .from("sound_files")
      .createSignedUrl(file, 60 * 60);

    if (error || !data?.signedUrl) {
      console.error("Signed URL error:", error);
      return NextResponse.json(
        { message: "Signed URL error", error },
        { status: 500 }
      );
    }

    const audioRes = await fetch(data.signedUrl);

    if (!audioRes.ok) {
      return new NextResponse("Failed to fetch audio file", {
        status: audioRes.status,
      });
    }

    const ext = file.split(".").pop()?.toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === "wav") contentType = "audio/wav";
    if (ext === "mp3") contentType = "audio/mpeg";
    if (ext === "ogg") contentType = "audio/ogg";
    if (ext === "flac") contentType = "audio/flac";
    if (ext === "m4a") contentType = "audio/mp4";

    const buffer = await audioRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,

        // ⭐ CRITICAL FIXES
        "Content-Length": buffer.byteLength.toString(),
        "Accept-Ranges": "bytes",
        "Content-Disposition": `inline; filename="${file}"`,

        // CORS
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Expose-Headers": "*",
      },
    });
  } catch (err) {
    console.error("Proxy error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
