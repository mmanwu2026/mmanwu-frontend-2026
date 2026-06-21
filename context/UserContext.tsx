"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { User, Session } from "@supabase/supabase-js";

const UserContext = createContext<any>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseBrowserClient();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1️⃣ Load initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user || null);
      setLoading(false);
    });

    // 2️⃣ Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        const sessionUser = session?.user || null;
        setUser(sessionUser);
        setLoading(false);

        if (sessionUser) {
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", sessionUser.id)
            .maybeSingle();

          if (!profile) {
            const randomNumber = Math.floor(1000 + Math.random() * 90000);
            const username = `maskling_${randomNumber}`;

            await supabase.from("users").insert({
              id: sessionUser.id,
              name: sessionUser.user_metadata?.name || "",
              username,
              display_name_enabled: false,
            });
          }
        }
      }
    );

    // 3️⃣ Cleanup
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
