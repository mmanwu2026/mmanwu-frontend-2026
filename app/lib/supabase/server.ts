import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // Server components cannot set cookies — ignore
        },
        remove() {
          // Server components cannot remove cookies — ignore
        },
      },

      // ⭐ CRITICAL FIX — prevents refresh token errors
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
