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

export const IdentityContext = createContext<IdentityContextType | null>(null);

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const { supabase, user } = useSupabase();

  const [authReady, setAuthReady] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);   // ⭐ NEW
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [creators, setCreators] = useState<Record<string, CreatorProfile>>({});

  /* -------------------------------------------------------
     FIX: BLOCK APP UNTIL SUPABASE RESTORES SESSION
     ------------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      // Supabase restored session → allow app to proceed
      setSessionLoaded(true);
    }

    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      // Any auth change → session is now fully known
      setSessionLoaded(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  /* -------------------------------------------------------
     RLS AUTH HANDSHAKE — TS-SAFE
     ------------------------------------------------------- */
  useEffect(() => {
    async function handshake() {
      if (!sessionLoaded) return;   // ⭐ NEW: wait for session restore
      if (!user) return;

      await supabase.from("profiles").select("id").limit(1);
      setAuthReady(true);
    }

    handshake();
  }, [supabase, user, sessionLoaded]);

  /* -------------------------------------------------------
     LOAD LOGGED-IN USER PROFILE — TS-SAFE
     ------------------------------------------------------- */
  useEffect(() => {
    async function loadProfile() {
      if (!authReady) return;
      if (!user) return;

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

  /* -------------------------------------------------------
     FIX: BLOCK CHILDREN UNTIL SESSION IS READY
     ------------------------------------------------------- */
  if (!sessionLoaded) {
    return <p className="text-gray-500 p-6">Loading…</p>;
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
