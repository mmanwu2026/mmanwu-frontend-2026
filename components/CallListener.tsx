"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";

// GLOBAL guard — survives Strict Mode double-mount
let globalInitialized = false;

export default function CallListener() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  // Load userId once
  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id || null);
    }
    loadUser();
  }, [supabase]);

  // Subscribe ONCE globally
  useEffect(() => {
    if (!userId) return;

    // Strict Mode fix — block second mount
    if (globalInitialized) return;
    globalInitialized = true;

    // IMPORTANT: restore original channel name
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

        console.log("CALL LISTENER → incoming call event:", data);

        if (data.type !== "incoming_call") return;

        // If app is visible → show modal + auto-navigate
        if (document.visibilityState === "visible") {
          router.push(`/call/${data.room_id}?role=callee`);

          try {
            const audio = new Audio("/sounds/ringtone.mp3");
            audio.play().catch(() => {});
          } catch {}

          return;
        }

        // If app is NOT visible → push fallback
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, router]);

  return null;
}
