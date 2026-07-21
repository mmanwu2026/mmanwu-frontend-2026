"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSupabase } from "./SupabaseContext";

interface CreatorProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface IdentityContextType {
  authReady: boolean;
  profile: CreatorProfile | null;
  creators: Record<string, CreatorProfile>;
  fetchCreator: (id: string) => Promise<CreatorProfile | null>;
}

const IdentityContext = createContext<IdentityContextType | null>(null);

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const { supabase, user } = useSupabase();

  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [creators, setCreators] = useState<Record<string, CreatorProfile>>({});

  /* -------------------------------------------------------
     RLS AUTH HANDSHAKE — TS-SAFE
     ------------------------------------------------------- */
  useEffect(() => {
    async function handshake() {
      if (!user) return;   // ⭐ TS-safe: check INSIDE async function

      await supabase.from("profiles").select("id").limit(1);
      setAuthReady(true);
    }

    handshake();
  }, [supabase, user]);

  /* -------------------------------------------------------
     LOAD LOGGED-IN USER PROFILE — TS-SAFE
     ------------------------------------------------------- */
  useEffect(() => {
    async function loadProfile() {
      if (!authReady) return;
      if (!user) return;   // ⭐ TS-safe: check INSIDE async function

      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", user.id)
        .limit(1);

      setProfile(data?.[0] ?? null);
    }

    loadProfile();
  }, [authReady, supabase, user]);

  /* -------------------------------------------------------
     GLOBAL CREATOR FETCHER — TS-SAFE
     ------------------------------------------------------- */
  async function fetchCreator(id: string): Promise<CreatorProfile | null> {
    if (!authReady) return null;

    if (creators[id]) return creators[id];

    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", id)
      .limit(1);

    const profile = data?.[0] ?? null;

    if (profile) {
      setCreators((prev) => ({ ...prev, [id]: profile }));
    }

    return profile;
  }

  return (
    <IdentityContext.Provider
      value={{
        authReady,
        profile,
        creators,
        fetchCreator,
      }}
    >
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used within IdentityProvider");
  return ctx;
}
