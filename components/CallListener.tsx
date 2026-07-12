"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";

// GLOBAL guard — survives Strict Mode double-mount
let globalInitialized = false;

export default function CallListener() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  // Modal + ringtone state
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Load userId once
  useEffect(() => {
    async function loadUser() {
      console.log("CALL LISTENER DEBUG → loading user session");
      const session = await supabase.auth.getSession();
      const uid = session.data.session?.user?.id || null;
      console.log("CALL LISTENER DEBUG → userId:", uid);
      setUserId(uid);
    }
    loadUser();
  }, [supabase]);

  // Accept call
  function acceptCall() {
    if (!incomingCall) return;

    console.log("CALL LISTENER DEBUG → acceptCall invoked");

    // Stop ringtone
    ringtoneRef.current?.pause();
    ringtoneRef.current = null;

    // Navigate to CallRoom
    router.push(`/call/${incomingCall.room_id}?role=callee`);

    // Clear modal
    setIncomingCall(null);
  }

  // Decline call
  async function declineCall() {
    if (!incomingCall) return;

    console.log("CALL LISTENER DEBUG → declineCall invoked");

    // Stop ringtone
    ringtoneRef.current?.pause();
    ringtoneRef.current = null;

    // Insert decline event
    await supabase.from("call_events").insert({
      type: "call_declined",
      call_id: incomingCall.call_id,
      room_id: incomingCall.room_id,
      caller_id: incomingCall.caller_id,
      target_user_id: incomingCall.target_user_id,
      status: "declined",
      created_at: new Date().toISOString(),
    });

    console.log("CALL LISTENER DEBUG → call_declined event inserted");

    // Clear modal
    setIncomingCall(null);
  }

  // Subscribe ONCE globally
  useEffect(() => {
    if (!userId) return;

    if (globalInitialized) {
      console.log("CALL LISTENER DEBUG → already initialized, skipping subscription");
      return;
    }
    globalInitialized = true;

    console.log("CALL LISTENER DEBUG → subscribing to call_events for user:", userId);

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

        console.log("CALL LISTENER DEBUG → event received:", data);

        // Handle incoming call
        if (data.type === "incoming_call") {
          console.log("CALL LISTENER DEBUG → incoming_call detected");

          if (document.visibilityState === "visible") {
            console.log("CALL LISTENER DEBUG → app visible → showing modal");

            setIncomingCall(data);

            try {
              ringtoneRef.current = new Audio("/sounds/ringtone.mp3");
              ringtoneRef.current.loop = true;
              ringtoneRef.current.play().catch((err) =>
                console.warn("CALL LISTENER DEBUG → ringtone play blocked:", err)
              );
            } catch (err) {
              console.error("CALL LISTENER DEBUG → ringtone error:", err);
            }

            return;
          }

          // App not visible → push notification fallback
          try {
            console.log("CALL LISTENER DEBUG → app hidden → sending push notification");

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
            console.error("CALL LISTENER DEBUG → push notification error:", err);
          }
        }

        // Handle call_started (future-proof)
        if (data.type === "call_started") {
          console.log("CALL LISTENER DEBUG → call_started received");
        }

        // Handle call_cancelled (future-proof)
        if (data.type === "call_cancelled") {
          console.log("CALL LISTENER DEBUG → call_cancelled received");

          // Stop ringtone if ringing
          ringtoneRef.current?.pause();
          ringtoneRef.current = null;

          // Clear modal
          setIncomingCall(null);
        }

        // Handle call_declined (callee-side cleanup)
        if (data.type === "call_declined") {
          console.log("CALL LISTENER DEBUG → call_declined received");

          // Stop ringtone
          ringtoneRef.current?.pause();
          ringtoneRef.current = null;

          // Clear modal
          setIncomingCall(null);
        }
      }
    );

    channel.subscribe();

    return () => {
      console.log("CALL LISTENER DEBUG → unsubscribing channel");
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, router]);

  // Modal UI
  if (incomingCall) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-neutral-800 p-6 rounded-xl w-72 text-center text-white">
          <p className="text-lg font-semibold mb-2">Incoming Call</p>
          <p className="text-sm text-neutral-300 mb-4">
            {incomingCall.caller_name || "Someone"} is calling you…
          </p>

          <div className="flex justify-center gap-4">
            <button
              onClick={acceptCall}
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-500"
            >
              Accept
            </button>

            <button
              onClick={declineCall}
              className="px-4 py-2 bg-red-600 rounded hover:bg-red-500"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
