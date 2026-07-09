"use client";

import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";

export default function NotificationsPage() {
  const { supabase } = useSupabase();
  const [userId, setUserId] = useState<string | null>(null);

  // Load user ID
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      const id = session.data.session?.user?.id || null;
      setUserId(id);
    }
    loadUser();
  }, [supabase]);

  return (
    <div className="text-white p-4">
      <h1 className="text-xl font-bold mb-4">Notifications</h1>
      <p>Your notifications will appear here.</p>
    </div>
  );
}
