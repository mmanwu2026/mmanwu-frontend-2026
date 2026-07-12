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
          storage: typeof window !== "undefined" ? localStorage : undefined,
          autoRefreshToken: true,
        },
      }
    );
  }, []);

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // ⭐ Restore session only on client
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("supabase_session");
      if (saved) {
        const session = JSON.parse(saved);
        supabase.auth.setSession(session);
        setUser(session.user ?? null);
      }
    }

    // ⭐ Listen for session changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (typeof window !== "undefined" && session) {
          localStorage.setItem("supabase_session", JSON.stringify(session));
        }
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={{ supabase, user }}>
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
