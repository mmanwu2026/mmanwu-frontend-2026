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
          persistSession: true,      // ⭐ Keep user logged in
          autoRefreshToken: true,    // ⭐ Refresh tokens automatically
        },
      }
    );
  }, []);

  const [user, setUser] = useState<User | null>(null);

  // ⭐ Modern logout — no clearing storage, no clearing caches
  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  useEffect(() => {
    // ⭐ Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // ⭐ Load initial session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    return () => {
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
