import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file");

    if (!file) {
      return new NextResponse("Missing file parameter", { status: 400 });
    }

    // Build the Supabase signed URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const signedUrlRes = await fetch(
      `${supabaseUrl}/storage/v1/object/sign/sound_files/${file}`,
      {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!signedUrlRes.ok) {
      return new NextResponse("Failed to generate signed URL", {
        status: signedUrlRes.status,
      });
    }

    const { signedURL } = await signedUrlRes.json();

    // Fetch the actual audio file
    const audioRes = await fetch(signedURL);

    if (!audioRes.ok) {
      return new NextResponse("Failed to fetch audio file", {
        status: audioRes.status,
      });
    }

    // Stream the audio with proper CORS headers
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
