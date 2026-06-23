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

  // ⭐ FIX: Wait for Supabase hydration AND auth listener
  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (data.session?.user) {
        setUser(data.session.user);
      }

      // ❗ DO NOT set loading=false yet — wait for listener
    };

    load();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (!active) return;

        setUser(session?.user ?? null);
        setLoading(false); // ⭐ Correct place to end loading
      }
    );

    return () => {
      active = false;
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
