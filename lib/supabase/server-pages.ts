import { createServerClient } from "@supabase/ssr";

export function createSupabaseServerClientPages(req: any, res: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies[name];
        },
        set(name: string, value: string, options: any) {
          res.cookie(name, value, options);
        },
        remove(name: string, options: any) {
          res.cookie(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );
}
