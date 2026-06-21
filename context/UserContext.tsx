"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface UserContextValue {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseBrowserClient();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load initial session AND wait for Supabase to hydrate
  useEffect(() => {
    let active = true;

    async function load() {
      // Wait for Supabase to finish restoring the session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      setUser(session?.user ?? null);

      // IMPORTANT: do NOT set loading=false until after hydration
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [supabase]);

  // Listen for auth changes (login, logout, refresh)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside <UserProvider>");
  }
  return ctx;
}
