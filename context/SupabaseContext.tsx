"use client";

import { createContext, useContext, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SupabaseContext = createContext<any>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // Create the client ONCE per browser session
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase must be used within SupabaseProvider");
  }
  return ctx;
}
