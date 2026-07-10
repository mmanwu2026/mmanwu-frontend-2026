"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";

export default function CallListener() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  // Load userId ONCE
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

  // Subscribe ONCE — even if userId changes later
  useEffect(() => {
    if (!userId) return;
    if (channelRef.current) return; // prevent double subscription

    const channel = supabase.channel(`incoming-call-${userId}`);

    // Attach listeners BEFORE subscribe()
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

        // Auto-open if visible
        if (document.visibilityState === "visible") {
          router.push(`/call/${data.room_id}?role=callee`);

          try {
            const audio = new Audio("/sounds/ringtone.mp3");
            audio.play().catch(() => {});
          } catch {}

          return;
        }

        // Push fallback
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

    // Subscribe AFTER listeners are attached
    channel.subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, supabase]);

  return null;
}
