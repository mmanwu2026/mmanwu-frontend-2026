"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useUser } from "@/context/UserContext";
import MessengerSidebar from "@/components/messenger/MessengerSidebar";

interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function MessengerPage() {
  const { supabase } = useSupabase(); 
  const { user, loading: userLoading } = useUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", user.id);

      if (!error && data) setUsers(data as UserRow[]);
      setLoading(false);
    }

    loadUsers();
  }, [user, supabase]);

  if (userLoading || loading) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl mb-4">Messenger</h1>
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl mb-4">Messenger</h1>
        <p>Please sign in to use Messenger.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <MessengerSidebar users={users} userId={user.id} />

      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a conversation
      </div>
    </div>
  );
}
