"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";
import VideoCallModal from "./VideoCallModal";

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

  const supabase = useSupabase();
  const finalRoomId = roomId;

  const searchParams = useSearchParams();
  const isIncoming = searchParams?.get("incoming") === "1";

  const [messages, setMessages] = useState<any[]>([]);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callActive, setCallActive] = useState(false);

  const subscribedRef = useRef(false);

  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState("");

  const [signalingState, setSignalingState] = useState({
    isCaller: false,
    roomId: finalRoomId,
    participants: [] as string[],
    offers: {} as Record<string, RTCSessionDescriptionInit>,
    answers: {} as Record<string, RTCSessionDescriptionInit>,
    candidates: {} as Record<string, RTCIceCandidate[]>,

    sendOffer: async (targetId: string, offer: RTCSessionDescriptionInit) => {
      await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: targetId,
        room_id: finalRoomId,
        message_type: "call_offer",
        metadata: { offer },
      });
    },

    sendAnswer: async (targetId: string, answer: RTCSessionDescriptionInit) => {
      await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: targetId,
        room_id: finalRoomId,
        message_type: "call_answer",
        metadata: { answer },
      });
    },

    sendCandidate: async (targetId: string, candidate: RTCIceCandidate) => {
      await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: targetId,
        room_id: finalRoomId,
        message_type: "ice_candidate",
        metadata: { candidate },
      });
    },
  });

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", finalRoomId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  }

  useEffect(() => {
    loadMessages();
  }, [finalRoomId]);

  // ⭐ Load usernames
  useEffect(() => {
    async function loadUsernames() {
      const ids = Array.from(
        new Set([
          userId,
          otherUserId,
          ...messages.map((m) => m.sender_id),
          ...messages.map((m) => m.receiver_id),
        ].filter(Boolean))
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
  }, [messages, userId, otherUserId]);

  // ⭐ Incoming call auto-open
  useEffect(() => {
    if (isIncoming) {
      setCallActive(true);
      setCallModalOpen(true);
    }
  }, [isIncoming]);

  // ⭐ Realtime subscription
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
        (payload: any) => {
          const msg = payload.new;

          if (msg.room_id !== finalRoomId) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // ⭐ Call signaling routing
          if (
            msg.message_type === "call_offer" ||
            msg.message_type === "call_answer" ||
            msg.message_type === "ice_candidate"
          ) {
            setSignalingState((prev) => {
              const participants = Array.from(
                new Set(
                  [
                    ...prev.participants,
                    msg.sender_id,
                    msg.receiver_id,
                  ].filter(Boolean)
                )
              );

              const next = { ...prev, participants };

              if (msg.message_type === "call_offer" && msg.metadata?.offer) {
                next.offers = {
                  ...prev.offers,
                  [msg.sender_id]: msg.metadata.offer,
                };
              }

              if (msg.message_type === "call_answer" && msg.metadata?.answer) {
                next.answers = {
                  ...prev.answers,
                  [msg.sender_id]: msg.metadata.answer,
                };
              }

if (msg.message_type === "ice_candidate" && msg.metadata?.candidate) {
  console.log("RAW CANDIDATE FROM SUPABASE", msg.metadata.candidate);
  
                const existing = prev.candidates[msg.sender_id] || [];
                next.candidates = {
                  ...prev.candidates,
                  [msg.sender_id]: [...existing, msg.metadata.candidate],
                };
              }

              return next;
            });
          }

          // ⭐ Auto-open modal for callee
          if (msg.message_type === "call_offer") {
            setCallActive(true);
            if (msg.sender_id !== userId) {
              setCallModalOpen(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      subscribedRef.current = false;
    };
  }, [finalRoomId, userId, supabase]);

  // ⭐ Send message
  async function sendMessage() {
    if (!newMessage.trim()) return;

    await supabase.from("messages").insert({
      room_id: finalRoomId,
      sender_id: userId,
      content: newMessage,
      message_type: "text",
    });

    setNewMessage("");
  }

  function joinCall() {
    setCallModalOpen(true);
  }

  async function startGroupCall() {
    const inferredParticipants = Array.from(
      new Set(
        messages
          .map((m) => m.sender_id)
          .filter((id: string) => id && id !== userId)
      )
    );

    setSignalingState((prev) => ({
      ...prev,
      isCaller: true,
      participants: inferredParticipants,
    }));

    setTimeout(() => {
      setCallActive(true);
      setCallModalOpen(true);
    }, 50);
  }

  return (
    <div className="flex flex-col h-full bg-neutral-950">

      {/* ⭐ Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900 sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Room</span>
          <span className="text-xs text-neutral-400">{finalRoomId}</span>
        </div>

        <button
          onClick={startGroupCall}
          className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-500"
        >
          Start Group Call
        </button>
      </div>

      {/* ⭐ Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="bg-neutral-800 p-3 rounded-lg">
            <div className="text-xs font-semibold text-yellow-400">
              {usernames[m.sender_id] || m.sender_id}
            </div>
            <div className="text-sm mt-1">{m.content}</div>
          </div>
        ))}

        {callActive && (
          <div className="mt-4 p-3 bg-blue-900/40 border border-blue-600 rounded flex items-center justify-between">
            <span className="text-sm text-blue-100">
              Call in progress in this room.
            </span>
            <button
              onClick={joinCall}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
            >
              Join Call
            </button>
          </div>
        )}
      </div>

      {/* ⭐ Composer */}
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

      <VideoCallModal
        isOpen={callModalOpen}
        onCloseAction={() => {
          setCallModalOpen(false);
          setCallActive(false);
        }}
        signaling={signalingState}
        userId={userId}
        roomId={finalRoomId}
      />
    </div>
  );
}
