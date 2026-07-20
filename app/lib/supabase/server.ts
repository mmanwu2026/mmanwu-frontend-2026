import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  // ⭐ Your Next.js version returns a Promise — so we await it
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },

        // ⭐ Your cookieStore does NOT support set/remove — so we NO-OP them
        set() {},
        remove() {},
      },
    }
  );
}
