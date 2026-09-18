"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient, type User } from "@supabase/supabase-js";

interface SupabaseContextType {
  supabase: any;
  user: User | null;
  logout: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }, []);

  const [user, setUser] = useState<User | null>(null);

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      try {
        const { data } = await supabase.auth.getSession();

        if (data.session?.user) {
          const { data: userData, error: userError } =
            await supabase.auth.getUser();

          if (userError || !userData?.user) {
            await supabase.auth.signOut();
            if (mounted) setUser(null);
            return;
          }

          if (mounted) setUser(data.session.user);
          return;
        }

        if (mounted) setUser(null);
      } catch (err) {
        console.error("Session hydration failed:", err);
        await supabase.auth.signOut();
        if (mounted) setUser(null);
      }
    }

    hydrateSession();

    // ⭐ Corrected iOS WebView fix — reload ONLY on SIGNED_IN / SIGNED_OUT
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }

      if (
        typeof window !== "undefined" &&
        window.navigator.userAgent.includes("iPhone")
      ) {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          window.location.reload();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={{ supabase, user, logout }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx)
    throw new Error("useSupabase must be used within SupabaseProvider");
  return ctx;
}

export function useSupabaseUser() {
  const ctx = useContext(SupabaseContext);
  if (!ctx)
    throw new Error("useSupabaseUser must be used within SupabaseProvider");
  return ctx.user;
}
