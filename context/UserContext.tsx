// minor change to trigger deployment
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import type { User } from "@supabase/supabase-js";

const UserContext = createContext<any>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user || null;

      setUser(sessionUser);

      if (sessionUser) {
        // 1️⃣ Check if profile exists
        const { data: profile, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", sessionUser.id)
          .maybeSingle();

        // 2️⃣ If no profile exists → create it
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

      setLoading(false);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const sessionUser = session?.user || null;
        setUser(sessionUser);

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

    return () => listener.subscription.unsubscribe();
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
