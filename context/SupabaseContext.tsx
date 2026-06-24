"use client";

import { createContext, useContext, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

const SupabaseContext = createContext<any>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            if (typeof document === "undefined") return null;
            const match = document.cookie.match(
              new RegExp("(^| )" + name + "=([^;]+)")
            );
            return match ? match[2] : null;
          },
          set(name: string, value: string, options: any) {
            if (typeof document === "undefined") return;
            let cookie = `${name}=${value}; path=/;`;
            if (options?.maxAge) cookie += ` max-age=${options.maxAge};`;
            if (options?.expires) cookie += ` expires=${options.expires.toUTCString()};`;
            if (options?.sameSite) cookie += ` samesite=${options.sameSite};`;
            if (options?.secure) cookie += " secure;";
            document.cookie = cookie;
          },
          remove(name: string, options: any) {
            if (typeof document === "undefined") return;
            document.cookie = `${name}=; path=/; max-age=0;`;
          },
        },
      }
    );
  }, []);

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase must be used within SupabaseProvider");
  }
  return ctx;
}
