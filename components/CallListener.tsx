"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";

export default function CallListener() {
  const supabase = useSupabase();
  const router = useRouter();

  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // ⭐ Load authenticated user ID
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id || null);
    }
    loadUser();
  }, [supabase]);

  // ⭐ Subscribe only after userId is known
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`incoming-call-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_events",
          filter: `target_user_id=eq.${userId}`,
        },
        (payload: { new: any }) => {
          setIncomingCall(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  function acceptCall() {
    if (!incomingCall) return;
    router.push(`/call/${incomingCall.room_id}`);
    setIncomingCall(null);
  }

  function declineCall() {
    setIncomingCall(null);
  }

  if (!incomingCall) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-neutral-800 p-4 rounded-lg shadow-lg border border-neutral-700 z-[9999]">
      <div className="text-white mb-2">
        Incoming call from {incomingCall.caller_id}
      </div>

      <div className="flex gap-2">
        <button
          onClick={acceptCall}
          className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 text-sm"
        >
          Accept
        </button>

        <button
          onClick={declineCall}
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-500 text-sm"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
