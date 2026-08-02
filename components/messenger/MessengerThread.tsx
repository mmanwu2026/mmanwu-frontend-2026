"use client";

import {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/app/context/SupabaseContext";
import { registerWebPushFallback } from "@/app/push/registerWebPushFallback";

/* ---------------- FETCH TARGET FCM TOKEN (SAFE) ---------------- */
async function getTargetFCMToken(userId: string, supabase: any) {
  const { data: rows, error } = await supabase
    .from("user_push_tokens")
    .select("fcm_token")
    .eq("user_id", userId)
    .limit(1);

  if (error) return null;
  return rows?.[0]?.fcm_token || null;
}

/* ---------------- FETCH TARGET WEBPUSH SUBSCRIPTION (SAFE) ---------------- */
async function getTargetWebPushSubscription(userId: string, supabase: any) {
  const { data: row, error } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return row?.subscription || null;
}

type MessengerThreadProps = {
  userId: string;
  otherUserId?: string;
  roomId?: string;
  dmAllowed: boolean;
};

export type MessengerThreadHandle = {
  startCall: () => Promise<void>;
};

const MessengerThread = forwardRef<MessengerThreadHandle, MessengerThreadProps>(
  ({ userId, otherUserId, roomId, dmAllowed }, ref) => {
    const { supabase } = useSupabase();
    const router = useRouter();
    const finalRoomId = roomId;

    const [messages, setMessages] = useState<any[]>([]);
    const [usernames, setUsernames] = useState<Record<string, string>>({});
    const [newMessage, setNewMessage] = useState("");
    const [confirmClear, setConfirmClear] = useState(false);

    const subscribedRef = useRef(false);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const [otherTyping, setOtherTyping] = useState(false);

    /* ---------------- LOAD MESSAGES ---------------- */
    async function loadMessages() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", finalRoomId)
        .order("created_at", { ascending: true });

      setMessages(data || []);
    }

    useEffect(() => {
      if (!finalRoomId) return;
      loadMessages();
    }, [finalRoomId]);

    /* ---------------- SCROLL TO BOTTOM ---------------- */
    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    /* ---------------- LOAD USERNAMES ---------------- */
    useEffect(() => {
      async function loadUsernames() {
        const ids = Array.from(
          new Set(
            [
              userId,
              otherUserId,
              ...messages.map((m) => m.sender_id),
              ...messages.map((m) => m.receiver_id),
            ].filter(Boolean)
          )
        );

        if (ids.length === 0) return;

        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", ids);

        const map: Record<string, string> = {};
        data?.forEach((u) => {
          map[u.id] = u.display_name || u.username || u.id;
        });

        setUsernames(map);
      }

      loadUsernames();
    }, [messages, userId, otherUserId, supabase]);

    /* ---------------- ENSURE WEBPUSH SUBSCRIPTION ---------------- */
    useEffect(() => {
      async function ensureWebPush() {
        const sub = await getTargetWebPushSubscription(userId, supabase);
        if (!sub) await registerWebPushFallback(userId, supabase);
      }
      ensureWebPush();
    }, [userId, supabase]);

    /* ---------------- REALTIME MESSAGES ---------------- */
    useEffect(() => {
      if (!finalRoomId) return;
      if (subscribedRef.current) return;
      subscribedRef.current = true;

      const channel = supabase
        .channel(`room-${finalRoomId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          async (payload) => {
            const msg = payload.new;
            if (msg.room_id !== finalRoomId) return;

            if (msg.sender_id !== userId) {
              await supabase
                .from("messages")
                .update({ delivered_at: new Date().toISOString() })
                .eq("id", msg.id)
                .is("delivered_at", null);
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        subscribedRef.current = false;
      };
    }, [finalRoomId, userId, supabase]);

    /* ---------------- REALTIME TYPING EVENTS ---------------- */
    useEffect(() => {
      if (!finalRoomId) return;

      const channel = supabase
        .channel(`typing-${finalRoomId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "typing_events" },
          (payload) => {
            const evt = payload.new;

            if (evt.room_id !== finalRoomId) return;
            if (evt.user_id === userId) return;

            setOtherTyping(evt.is_typing);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [finalRoomId, userId, supabase]);

    /* ---------------- MARK SEEN ---------------- */
    useEffect(() => {
      if (!userId || !finalRoomId) return;

      async function markSeen() {
        await supabase
          .from("room_participants")
          .update({ last_seen: new Date().toISOString() })
          .eq("room_id", finalRoomId)
          .eq("user_id", userId);
      }

      markSeen();
    }, [userId, finalRoomId, supabase]);

    /* ---------------- CLEAR / DELETE / SEND ---------------- */
    async function clearChat() {
      if (!finalRoomId) return;
      await supabase.from("messages").delete().eq("room_id", finalRoomId);
      setMessages([]);
    }

    async function deleteMessage(messageId: string) {
      await supabase.from("messages").delete().eq("id", messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }

    async function sendMessage() {
      const trimmed = newMessage.trim();
      if (!trimmed || !finalRoomId) return;

      await supabase.from("typing_events").insert({
        room_id: finalRoomId,
        user_id: userId,
        is_typing: false,
      });

      const { error } = await supabase.from("messages").insert({
        room_id: finalRoomId,
        sender_id: userId,
        receiver_id: otherUserId,
        content: trimmed,
        message_type: "text",
      });

      if (error) console.error("sendMessage error:", error);

      if (!otherUserId) {
        setNewMessage("");
        return;
      }

      await supabase.from("notifications").insert({
        user_id: otherUserId,
        actor_id: userId,
        event_type: "message",
        message: trimmed,
        dm_room_id: finalRoomId,
      });

      const safePayload = {
        targetUserId: String(otherUserId ?? ""),
        title: String(usernames?.[userId] ?? ""),
        body: String(trimmed ?? ""),
        data: {
          event: "dm",
          dm_room_id: String(finalRoomId ?? ""),
          sender_id: String(userId ?? ""),
          message: String(trimmed ?? ""),
        },
      };

      await supabase.functions.invoke("send-push", {
        body: JSON.stringify(safePayload),
      });

      setNewMessage("");
    }

    async function uploadAndSend(
      file: File,
      type: "image" | "audio" | "video"
    ) {
      if (!finalRoomId) return;

      const ext = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;

      const bucket = type === "audio" ? "sound_files" : "vision_files";

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) {
        console.error("Upload error:", error);
        return;
      }

      const url =
        supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;

      await supabase.from("messages").insert({
        room_id: finalRoomId,
        sender_id: userId,
        receiver_id: otherUserId,
        message_type: type,
        content: url,
      });

      if (otherUserId) {
        await supabase.from("notifications").insert({
          user_id: otherUserId,
          actor_id: userId,
          event_type: "message",
          message: url,
          dm_room_id: finalRoomId,
        });
      }
    }

    async function handleImageUpload(e: any) {
      const file = e.target.files[0];
      if (!file) return;
      await uploadAndSend(file, "image");
    }

    async function handleAudioUpload(e: any) {
      const file = e.target.files[0];
      if (!file) return;
      await uploadAndSend(file, "audio");
    }

    async function handleVideoUpload(e: any) {
      const file = e.target.files[0];
      if (!file) return;
      await uploadAndSend(file, "video");
    }

    /* ---------------- CALL BUTTON ---------------- */
    async function startCall() {
      if (!otherUserId) return;

      const session = await supabase.auth.getSession();
      console.log("MessengerThread session:", session.data.session);

      const newRoomId = crypto.randomUUID();
      const callId = crypto.randomUUID();

      await supabase.from("call_events").insert({
        type: "incoming_call",
        call_id: callId,
        room_id: newRoomId,
        caller_id: userId,
        caller_name: usernames[userId] || "Unknown",
        target_user_id: otherUserId,
        url: `/call/${newRoomId}`,
        status: "ringing",
        created_at: new Date().toISOString(),
      });

      await supabase.from("call_events").insert({
        type: "call_started",
        call_id: callId,
        room_id: newRoomId,
        caller_id: userId,
        target_user_id: otherUserId,
        status: "started",
        created_at: new Date().toISOString(),
      });

      await supabase.functions.invoke("send-push", {
        body: JSON.stringify({
          targetUserId: otherUserId,
          title: "Incoming Call",
          body: `${usernames[userId] || "Someone"} is calling you…`,
          data: {
            event: "incoming_call",
            room_id: newRoomId,
            call_id: callId,
            caller_name: usernames[userId] || "Unknown",
            url: `/call/${newRoomId}?role=callee`,
          },
        }),
      });

      router.push(`/call/${newRoomId}?role=caller`);
    }

    /* ---------------- EXPOSE startCall TO PARENT ---------------- */
    useImperativeHandle(ref, () => ({
      startCall,
    }));

    /* ---------------- SAFE CONDITIONAL RETURNS (AFTER HOOKS) ---------------- */
    if (!roomId) {
      return (
        <div className="p-4 text-white">
          Loading conversation…
        </div>
      );
    }

    if (!dmAllowed) {
      return (
        <div className="flex flex-col h-full bg-neutral-950">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                {usernames[otherUserId || ""] || "Conversation"}
              </span>
              <span className="text-xs text-neutral-400">{roomId}</span>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center text-neutral-400 px-4">
            This user is private. You must follow them to send messages.
          </div>
        </div>
      );
    }

    /* ---------------- UI RENDER BELOW THIS LINE ---------------- */
    return (
      <div className="bg-neutral-950">
        {/* Clear Chat Modal */}
        {confirmClear && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-neutral-800 p-6 rounded-xl w-64 text-center">
              <p className="text-white mb-4">Clear all messages?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    clearChat();
                    setConfirmClear(false);
                  }}
                  className="px-4 py-2 bg-red-600 rounded text-white"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-4 py-2 bg-gray-500 rounded text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {usernames[otherUserId || ""] || "Conversation"}
            </span>
            <span className="text-xs text-neutral-400">{finalRoomId}</span>

            {otherTyping && (
              <span className="text-xs text-blue-400 animate-pulse">
                Typing…
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setConfirmClear(true)}
              className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-500"
            >
              Clear
            </button>

            {otherUserId && (
              <button
                onClick={startCall}
                className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-500"
              >
                Call
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="px-4 py-4 space-y-4">
          {messages.map((m) => {
            const isOutgoing = m.sender_id === userId;
            const isLastOutgoing =
              isOutgoing &&
              messages.filter((x) => x.sender_id === userId).slice(-1)[0]?.id ===
                m.id;

            return (
              <div
                key={m.id}
                className={`flex ${
                  isOutgoing ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-xl relative ${
                    isOutgoing
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-800 text-neutral-200"
                  }`}
                >
                  {isOutgoing && (
                    <button
                      onClick={() => deleteMessage(m.id)}
                      className="absolute top-2 right-2 text-white/70 hover:text-white"
                    >
                      🗑️
                    </button>
                  )}

                  <div className="text-xs font-semibold opacity-80 mb-1">
                    {usernames[m.sender_id] || m.sender_id}
                  </div>

                  {m.message_type === "text" && (
                    <div className="text-sm leading-relaxed">{m.content}</div>
                  )}

                  {m.message_type === "image" && (
                    <img
                      src={m.content}
                      className="rounded-lg max-w-full mt-2"
                      alt="attachment"
                    />
                  )}

                  {m.message_type === "audio" && (
                    <audio controls className="mt-2 w-full">
                      <source src={m.content} />
                    </audio>
                  )}

                  {m.message_type === "video" && (
                    <video controls className="mt-2 max-w-full rounded-lg">
                      <source src={m.content} />
                    </video>
                  )}

                  {isLastOutgoing && (
                    <div className="text-right text-xs opacity-70 mt-1">
                      {m.seen_at
                        ? "Seen"
                        : m.delivered_at
                        ? "Delivered"
                        : "Sent"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900">
          <div className="flex gap-2 mb-3">
            <label
              htmlFor="image-upload"
              className="px-3 py-2 bg-neutral-800 text-white rounded cursor-pointer"
            >
              📷 Image
            </label>
            <label
              htmlFor="audio-upload"
              className="px-3 py-2 bg-neutral-800 text-white rounded cursor-pointer"
            >
              🎤 Audio
            </label>
            <label
              htmlFor="video-upload"
              className="px-3 py-2 bg-neutral-800 text-white rounded cursor-pointer"
            >
              🎥 Video
            </label>
          </div>

          <input
            id="image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <input
            id="audio-upload"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleAudioUpload}
          />
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoUpload}
          />

          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={async (e) => {
                setNewMessage(e.target.value);
                if (!finalRoomId) return;
                await supabase.from("typing_events").insert({
                  room_id: finalRoomId,
                  user_id: userId,
                  is_typing: true,
                });
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 text-white outline-none"
              placeholder="Type a message…"
            />

            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }
);

export default MessengerThread;
