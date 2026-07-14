"use client";

import { useParams, useRouter } from "next/navigation";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useEffect, useState } from "react";
import MessengerThread from "@/components/messenger/MessengerThread";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId;

  const router = useRouter();
  const { supabase } = useSupabase();

  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [otherUserId, setOtherUserId] = useState<string | undefined>(undefined);

  /* ---------------- LOAD USER ---------------- */
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id);
    }
    loadUser();
  }, [supabase]);

  /* ---------------- LOAD OTHER PARTICIPANT ---------------- */
  useEffect(() => {
    if (!userId || !roomId) return;

    async function loadOther() {
      const { data } = await supabase
        .from("room_participants")
        .select("user_id")
        .eq("room_id", roomId);

      if (!data) return;

      const others = data.filter(
        (p: { user_id: string }) => p.user_id !== userId
      );

      if (others.length > 0) {
        setOtherUserId(others[0].user_id);
      }
    }

    loadOther();
  }, [userId, roomId, supabase]);

  if (!userId) {
    return <div className="p-6 text-white">Loading user…</div>;
  }

  /* ---------------- UI-ONLY MOBILE + DESKTOP LAYOUT ---------------- */
  return (
    <div className="flex flex-col h-screen bg-black text-white">

      {/* ⭐ Mobile Header */}
      <div className="md:hidden flex items-center gap-3 p-4 border-b border-gray-800">
        <button
          onClick={() => router.push("/messenger")}
          className="px-3 py-2 bg-gray-800 rounded-lg text-sm"
        >
          ← Back
        </button>

        <h1 className="text-lg font-semibold">Conversation</h1>
      </div>

      {/* ⭐ Desktop Header */}
      <div className="hidden md:flex items-center p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Conversation</h1>
      </div>

      {/* ⭐ Scrollable Thread Area */}
      <div className="flex-1 overflow-y-auto">
        <MessengerThread
          userId={userId}
          roomId={roomId}
          otherUserId={otherUserId}
        />
      </div>
    </div>
  );
}
