"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useEffect, useState, useRef } from "react";
import CallRoom from "@/components/call/CallRoom";

export default function CallRoomPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  if (!params) return null;

  const roomId = params.roomId;
  const roleParam = searchParams?.get("role") ?? "caller";

  const { supabase } = useSupabase();
  const [userId, setUserId] = useState<string | undefined>(undefined);

  const wroteRef = useRef(false);

  /* ---------------- LOAD USER ---------------- */
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id);
    }
    loadUser();
  }, [supabase]);

  /* ---------------- UPSERT CALL SUBSCRIPTION ---------------- */
  useEffect(() => {
    if (!userId || !roomId) return;
    if (wroteRef.current) return;

    wroteRef.current = true;

    async function markCallSubscription() {
      await supabase
        .from("call_subscriptions")
        .upsert(
          {
            user_id: userId,
            room_id: roomId,
            last_joined_at: new Date().toISOString(),
          },
          { onConflict: "user_id,room_id" }
        );
    }

    markCallSubscription();
  }, [userId, roomId, supabase]);

  /* ---------------- LOADING STATE ---------------- */
  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Loading user…
      </div>
    );
  }

  /* ---------------- UI-ONLY LAYOUT ---------------- */
  return (
    <div className="flex flex-col h-screen bg-black text-white">

      {/* ⭐ Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-neutral-800">
        <button
          onClick={() => router.push("/messenger")}
          className="px-3 py-2 bg-neutral-800 rounded-lg text-sm"
        >
          ← Back
        </button>

        <h1 className="text-lg font-semibold">Call Room</h1>
      </div>

      {/* ⭐ Desktop Header */}
      <div className="hidden md:flex items-center p-4 border-b border-neutral-800">
        <h1 className="text-xl font-bold">Call Room</h1>
      </div>

      {/* ⭐ Scrollable Call Area */}
      <div className="flex-1 overflow-auto">
        <CallRoom
          userId={userId}
          roomId={roomId}
          role={roleParam === "callee" ? "callee" : "caller"}
        />
      </div>
    </div>
  );
}
