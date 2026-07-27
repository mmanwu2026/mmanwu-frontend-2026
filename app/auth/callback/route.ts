import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // ⭐ Only redirect when Supabase is actually exchanging a login code
  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);

    // After successful login, redirect to home
    return Response.redirect(`${requestUrl.origin}/`);
  }

  // ⭐ If no code, do NOT redirect — allow deep links to hydrate
  return new Response("OK");
}
