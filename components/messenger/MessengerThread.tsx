"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";
import { sendPush } from "@/lib/sendPush"; // ⭐ Make sure this path is correct

export default function MessengerThread({
  userId,
  otherUserId,
  roomId,
}: {
  userId: string;
  otherUserId?: string;
  roomId?: string;
}) {
  if (!roomId) return null;

  const { supabase } = useSupabase();
  const router = useRouter();
  const finalRoomId = roomId;

  const [messages, setMessages] = useState<any[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const subscribedRef = useRef(false);

  // LOAD MESSAGES
  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", finalRoomId)
      .eq("message_type", "text")
      .order("created_at", { ascending: true });

    setMessages(data || []);
  }

  useEffect(() => {
    loadMessages();
  }, [finalRoomId]);

  // CLEAR CHAT
  async function clearChat() {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("room_id", finalRoomId);

    if (error) {
      console.error("Clear Chat ERROR →", error);
      return;
    }

    setMessages([]);
  }

  // DELETE ONE MESSAGE (Outgoing Only)
  async function deleteMessage(messageId: string) {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      console.error("Delete message ERROR →", error);
      return;
    }

    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

  // LOAD USERNAMES
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
      data?.forEach(
        (u: { id: string; username: string | null; display_name: string | null }) => {
          map[u.id] = u.display_name || u.username || u.id;
        }
      );

      setUsernames(map);
    }

    loadUsernames();
  }, [messages, userId, otherUserId, supabase]);

  // REALTIME SUBSCRIPTION (TEXT ONLY)
  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const channel = supabase
      .channel(`room-${finalRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload: { new: any }) => {
          const msg = payload.new;

          if (msg.room_id !== finalRoomId) return;

          if (msg.message_type === "text") {
            if (!msg.content || msg.content.trim() === "") return;

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      subscribedRef.current = false;
    };
  }, [finalRoomId, userId, supabase]);

  // MARK SEEN WHEN THREAD IS OPEN
  useEffect(() => {
    if (!userId) return;

    async function markSeen() {
      await supabase
        .from("room_participants")
        .update({ last_seen: new Date().toISOString() })
        .eq("room_id", finalRoomId)
        .eq("user_id", userId);
    }

    markSeen();
  }, [userId, finalRoomId, supabase]);

  // SEND MESSAGE
  async function sendMessage() {
    const trimmed = newMessage.trim();
    if (!trimmed || trimmed.length === 0) return;

    await supabase.from("messages").insert({
      room_id: finalRoomId,
      sender_id: userId,
      content: trimmed,
      message_type: "text",
    });

    setNewMessage("");
  }

  // ⭐⭐⭐ NEW CALL SYSTEM — 1-to-1 Call (caller) WITH PUSH NOTIFICATION ⭐⭐⭐
  async function startCall() {
    if (!otherUserId) return;

    const newRoomId = crypto.randomUUID();
    const callId = crypto.randomUUID();

    // 1. Insert call event
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

    // ⭐ 2. Fetch callee's push subscription
    const { data: subData } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", otherUserId)
      .single();

    // ⭐ 3. Send push notification if subscription exists
    if (subData?.subscription) {
      await sendPush(subData.subscription, {
        title: "Incoming Call",
        body: `${usernames[userId] || "Someone"} is calling you`,
        url: `/call/${newRoomId}?role=callee`,
        room_id: newRoomId,
        call_id: callId,
        from_name: usernames[userId] || "Unknown",
      });
    }

    // 4. Caller enters call room
    router.push(`/call/${newRoomId}?role=caller`);
  }

  return (
    <div className="flex flex-col h-full bg-neutral-950">

      {/* Clear Chat Confirmation Modal */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-800 p-6 rounded-xl w-64 text-center">
            <p className="text-white mb-4">Clear all messages in this room?</p>
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900 sticky top-0 z-40">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Room</span>
          <span className="text-xs text-neutral-400">{finalRoomId}</span>
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => {
          const isOutgoing = m.sender_id === userId;
          const isLastOutgoing =
            isOutgoing &&
            messages.filter((x) => x.sender_id === userId).slice(-1)[0]?.id === m.id;

          return (
            <div key={m.id} className="bg-neutral-800 p-3 rounded-lg relative">

              {/* Trash icon only for outgoing messages */}
              {isOutgoing && (
                <button
                  onClick={() => deleteMessage(m.id)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-300"
                  title="Delete message"
                >
                  🗑️
                </button>
              )}

              <div className="text-xs font-semibold text-yellow-400">
                {usernames[m.sender_id] || m.sender_id}
              </div>

              <div className="text-sm mt-1">{m.content}</div>

              {isLastOutgoing && (
                <div className="text-right text-xs text-neutral-400 mt-1">
                  {m.seen_at ? "Seen" : m.delivered_at ? "Delivered" : "Sent"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="p-4 border-t border-neutral-700 bg-neutral-900">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-3 py-2 rounded bg-neutral-800 text-white outline-none"
            placeholder="Type a message…"
          />

          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
