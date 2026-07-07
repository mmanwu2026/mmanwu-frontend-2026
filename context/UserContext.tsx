"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

interface UserContextValue {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadInitialSession() {
      // ⭐ Load session immediately
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (data.session) {
        // ⭐ Session already restored — safe to set user
        setUser(data.session.user);
        setLoading(false);
      } else {
        // ⭐ No session yet — wait for onAuthStateChange
        setLoading(true);
      }
    }

    loadInitialSession();

    // ⭐ Listen for login/logout changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!active) return;

        if (session?.user) {
          setUser(session.user);
          setLoading(false);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      listener?.subscription?.unsubscribe?.();
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
