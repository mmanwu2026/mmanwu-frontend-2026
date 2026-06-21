"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  // Prevent server from evaluating browser APIs
  if (typeof window === "undefined") {
    return null as any;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const match = document.cookie
            .split("; ")
            .find((row) => row.startsWith(name + "="));
          return match ? match.split("=")[1] : null;
        },
        set() {},
        remove() {},
      },
    }
  );
}
