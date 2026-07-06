"use client";

import { useParams } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import MessengerThread from "@/components/messenger/MessengerThread";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId;

  const supabase = useSupabase();
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id);
    }
    loadUser();
  }, [supabase]);

  if (!userId || !roomId) {
    return <div className="p-6 text-white">Loading…</div>;
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <MessengerThread userId={userId} roomId={roomId} />
    </div>
  );
}
