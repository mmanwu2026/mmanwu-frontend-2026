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
        // ⭐ CRITICAL FIX: refresh session on PWA startup
        await supabase.auth.refreshSession();

        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setUser(data.session?.user ?? null);
        }
      } catch (err) {
        console.error("Session refresh failed:", err);
        await supabase.auth.signOut();
        if (mounted) setUser(null);
      }
    }

    hydrateSession();

    // ⭐ Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
        }
      }
    );

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
  if (!ctx) throw new Error("useSupabase must be used within SupabaseProvider");
  return ctx;
}

export function useSupabaseUser() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error("useSupabaseUser must be used within SupabaseProvider");
  return ctx.user;
}
