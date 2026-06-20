"use client";

import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

export function createSupabaseBrowserClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (typeof window !== "undefined") {
    // @ts-ignore
    window.supabase = client;
  }

  return client;
}
