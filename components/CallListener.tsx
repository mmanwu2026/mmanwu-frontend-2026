"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";

export default function CallListener() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const channelRef = useRef<any>(null);

  // Load authenticated user ID
  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const session = await supabase.auth.getSession();
      if (mounted) {
        setUserId(session.data.session?.user?.id || null);
      }
    }

    loadUser();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Subscribe once
  useEffect(() => {
    if (!userId) return;
    if (channelRef.current) return;

    const channel = supabase.channel(`incoming-call-${userId}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "call_events",
        filter: `target_user_id=eq.${userId}`,
      },
      async (payload: { new: any }) => {
        const data = payload.new;

        if (data.type !== "incoming_call") return;

        // Always set incomingCall so popup can render
        setIncomingCall(data);

        // App visible → auto-open call screen + ringtone
        if (document.visibilityState === "visible") {
          const waitForUser = async () => {
            let tries = 0;

            while (tries < 20) {
              const session = await supabase.auth.getSession();
              const uid = session.data.session?.user?.id;

              if (uid) {
                router.push(`/call/${data.room_id}?role=callee`);
                return;
              }

              await new Promise((r) => setTimeout(r, 100));
              tries++;
            }

            console.warn("Auto-open skipped: userId not ready");
          };

          waitForUser();

          try {
            const audio = new Audio("/sounds/ringtone.mp3");
            audio.volume = 1.0;
            audio.play().catch(() => {
              console.warn("Ringtone blocked until user interacts with the page.");
            });
          } catch (err) {
            console.error("Ringtone error:", err);
          }

          return;
        }

        // App not visible → push notification fallback
        try {
          const reg = await navigator.serviceWorker.ready;

          reg.showNotification("Incoming Call", {
            body: `${data.caller_name || "Someone"} is calling you`,
            icon: "/icons/icon-192.png",
            badge: "/icons/badge-72.png",
            data: {
              url: data.url,
              call_id: data.call_id,
              room_id: data.room_id,
              from_name: data.caller_name,
            },
          });
        } catch (err) {
          console.error("Push notification error:", err);
        }
      }
    );

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, supabase]);

  async function acceptCall() {
    if (!incomingCall) return;

    await supabase
      .from("call_events")
      .update({ status: "answered" })
      .eq("id", incomingCall.id);

    router.push(`/call/${incomingCall.room_id}?role=callee`);
    setIncomingCall(null);
  }

  async function declineCall() {
    if (!incomingCall) return;

    await supabase
      .from("call_events")
      .update({ status: "declined" })
      .eq("id", incomingCall.id);

    setIncomingCall(null);
  }

  if (!incomingCall) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-neutral-800 p-4 rounded-lg shadow-lg border border-neutral-700 z-[9999]">
      <div className="text-white mb-2">
        Incoming call from {incomingCall.caller_name || incomingCall.caller_id}
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
