"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import MessengerSidebar from "@/components/messenger/MessengerSidebar";

interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function MessengerPage() {
  const { supabase } = useSupabase();

  const [uid, setUid] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ---------------- LOAD USER ---------------- */
  useEffect(() => {
    async function loadSession() {
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;
      setUid(user?.id || null);
      setSessionLoading(false);
    }
    loadSession();
  }, [supabase]);

  /* ---------------- LOAD USERS ---------------- */
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

  /* ---------------- LOADING STATES ---------------- */
  if (sessionLoading || loading) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl mb-4">Messenger</h1>
        <p>Loading…</p>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl mb-4">Messenger</h1>
        <p>Please sign in to use Messenger.</p>
      </div>
    );
  }

  /* ---------------- MOBILE + DESKTOP LAYOUT ---------------- */
  return (
    <div className="h-screen flex flex-col bg-black text-white">

      {/* ⭐ Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Messenger</h1>
        <button
          onClick={() => setSidebarOpen(true)}
          className="px-3 py-2 bg-purple-700 rounded-lg"
        >
          Chats
        </button>
      </div>

      {/* ⭐ Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ⭐ Sidebar (mobile drawer + desktop fixed) */}
        <div
          className={`
            fixed inset-y-0 left-0 w-64 bg-gray-900 z-40 transform
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:static md:translate-x-0 md:w-72 md:flex-shrink-0
          `}
        >
          <MessengerSidebar
            users={users}
            userId={uid}
            onSelect={() => setSidebarOpen(false)}   // ⭐ Auto-close drawer
          />

          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute top-4 right-4 text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* ⭐ Main Content */}
        <div className="flex-1 flex items-center justify-center text-gray-400 p-4 overflow-auto">
          Select a conversation
        </div>
      </div>
    </div>
  );
}
