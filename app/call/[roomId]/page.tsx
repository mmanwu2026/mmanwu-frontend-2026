"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import CallRoom from "@/components/call/CallRoom";

export default function CallRoomPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();

  if (!params) return null;

  const roomId = params.roomId; // URL room ID
  const roleParam = searchParams?.get("role") ?? "caller";

  const { supabase } = useSupabase();
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id);
    }
    loadUser();
  }, [supabase]);

  // Record call subscription
  useEffect(() => {
    if (!userId || !roomId) return;

    async function markCallSubscription() {
      await supabase
        .from("call_subscriptions")
        .upsert({
          user_id: userId,
          room_id: roomId,
          last_joined_at: new Date().toISOString(),
        });
    }

    markCallSubscription();
  }, [userId, roomId, supabase]);

  if (!userId) {
    return <div className="p-6 text-white">Loading user…</div>;
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <CallRoom
        userId={userId}
        roomId={roomId}
        role={roleParam === "callee" ? "callee" : "caller"}
      />
    </div>
  );
}
