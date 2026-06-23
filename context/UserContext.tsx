"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import type { User, Session } from "@supabase/supabase-js";

interface UserContextValue {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ⭐ FIX: Wait for Supabase to hydrate session properly
  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      // ⭐ DO NOT immediately assume null means logged out
      // Supabase may still be hydrating the session
      if (data.session) {
        setUser(data.session.user);
      }

      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [supabase]);

  // Listen for auth changes
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
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
