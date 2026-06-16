"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import type { User } from "@supabase/supabase-js";

const UserContext = createContext<any>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      // 1️⃣ Wait for Supabase to hydrate the session
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user || null;

      if (mounted) setUser(sessionUser);

      // 2️⃣ If user exists, ensure profile exists
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

      if (mounted) setLoading(false);
    }

    hydrate();

    // 3️⃣ Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const sessionUser = session?.user || null;

        if (mounted) setUser(sessionUser);

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

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
