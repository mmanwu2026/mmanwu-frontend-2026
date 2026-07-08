"use client";

import AuthNav from "@/components/AuthNav";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";

export default function AuthNavWrapper() {
  const { supabase } = useSupabase();

  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;

      setAuthUserId(user?.id ?? null);
      setLoading(false);
    }

    loadSession();
  }, [supabase]);

  if (loading) return null;

  return <AuthNav />;
}
