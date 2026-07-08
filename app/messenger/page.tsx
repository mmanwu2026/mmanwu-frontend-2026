"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import MessengerSidebar from "@/components/messenger/MessengerSidebar";

interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function MessengerPage() {
  const { supabase } = useSupabase();

  // ⭐ Replaces useUser()
  const [uid, setUid] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ⭐ Load authenticated user
  useEffect(() => {
    async function loadSession() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
      setSessionLoading(false);
    }
    loadSession();
  }, [supabase]);

  // ⭐ Fetch other users
  useEffect(() => {
    async function loadUsers() {
      if (!uid) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", uid);

      if (!error && data) setUsers(data as UserRow[]);
      setLoading(false);
    }

    loadUsers();
  }, [uid, supabase]);

  // ⭐ Loading states
  if (sessionLoading || loading) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl mb-4">Messenger</h1>
        <p>Loading…</p>
      </div>
    );
  }

  // ⭐ Not logged in
  if (!uid) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl mb-4">Messenger</h1>
        <p>Please sign in to use Messenger.</p>
      </div>
    );
  }

  // ⭐ Render Messenger
  return (
    <div className="flex h-full">
      <MessengerSidebar users={users} userId={uid} />

      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a conversation
      </div>
    </div>
  );
}
