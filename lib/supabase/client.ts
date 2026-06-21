"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof document === "undefined") return null;
          const match = document.cookie
            .split("; ")
            .find((row) => row.startsWith(name + "="));
          return match ? match.split("=")[1] : null;
        },
        set() {
          // Browser client does not set cookies manually
        },
        remove() {
          // Browser client does not remove cookies manually
        },
      },
    }
  );
}
