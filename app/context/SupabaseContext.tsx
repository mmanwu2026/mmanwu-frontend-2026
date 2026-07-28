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
  hardLogout: () => Promise<void>;
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
          autoRefreshToken: true, // ⭐ KEEP THIS ON
        },
      }
    );
  }, []);

  const [user, setUser] = useState<User | null>(null);

  // ⭐ HARD LOGOUT — clears stale session safely in Supabase v2
  async function hardLogout() {
    try {
      await supabase.auth.signOut();

      // ⭐ Clear browser storage
      localStorage.clear();
      sessionStorage.clear();

      // ⭐ Clear SW caches (prevents stale PWA state)
      if ("caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }

      setUser(null);
    } catch (err) {
      console.error("Hard logout failed:", err);
      setUser(null);
    }
  }

  // ⭐ Detect zombie sessions (expired but resurrected)
  function detectZombieSession(session: any) {
    if (!session) return false;

    const expiresAt = session.expires_at;
    if (!expiresAt) return false;

    return expiresAt * 1000 < Date.now();
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (detectZombieSession(session)) {
          console.warn("Zombie session detected — forcing hard logout");
          await hardLogout();
          return;
        }

        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;

      if (detectZombieSession(session)) {
        console.warn("Zombie session detected on load — forcing hard logout");
        await hardLogout();
        return;
      }

      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={{ supabase, user, hardLogout }}>
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
