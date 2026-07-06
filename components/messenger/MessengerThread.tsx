"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";   // ⭐ FIXED
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
  const router = useRouter();   // ⭐ Now valid in App Router
  const finalRoomId = roomId;

  const searchParams = useSearchParams();
  const isIncoming = searchParams?.get("incoming") === "1";

  const [messages, setMessages] = useState<any[]>([]);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callActive, setCallActive] = useState(false);

  const subscribedRef = useRef(false);

  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState("");

  // ⭐ SIGNALING STATE
  const [signalingState, setSignalingState] = useState({
    isCaller: false,
    roomId: finalRoomId,
    participants: [] as string[],
    offers: {} as Record<string, RTCSessionDescriptionInit>,
    answers: {} as Record<string, RTCSessionDescriptionInit>,
    candidates: {} as Record<string, RTCIceCandidateInit[]>,

    sendOffer: async (targetId: string, offer: RTCSessionDescriptionInit) => {
      if (!offer || !offer.sdp) return;
      await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: targetId,
        room_id: finalRoomId,
        message_type: "call_offer",
        metadata: { offer },
      });
    },

    sendAnswer: async (targetId: string, answer: RTCSessionDescriptionInit) => {
      if (!answer || !answer.sdp) return;
      await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: targetId,
        room_id: finalRoomId,
        message_type: "call_answer",
        metadata: { answer },
      });
    },

    sendCandidate: async (targetId: string, candidate: RTCIceCandidateInit) => {
      if (!candidate || !candidate.candidate) return;
      await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: targetId,
        room_id: finalRoomId,
        message_type: "ice_candidate",
        metadata: { candidate },
      });
    },
  });

  // ⭐ RESET SIGNALING BETWEEN CALLS
  function resetSignaling() {
    setSignalingState(prev => ({
      ...prev,
      isCaller: false,
      participants: [],
      offers: {},
      answers: {},
      candidates: {},
    }));
  }

  // ⭐ LOAD MESSAGES
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

  // ⭐ LOAD USERNAMES
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

  // ⭐ AUTO-OPEN CALL MODAL FOR INCOMING CALL
  useEffect(() => {
    if (isIncoming) {
      resetSignaling();
      setCallActive(true);
      setCallModalOpen(true);
    }
  }, [isIncoming]);

  // ⭐ REALTIME SUBSCRIPTION (MESSAGES + SIGNALING)
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

          // ⭐ TEXT MESSAGES
          if (msg.message_type === "text") {
            if (!msg.content || msg.content.trim() === "") return;

            // ⭐ MARK DELIVERED (recipient only)
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

          // ⭐ SIGNALING ROUTING
          if (
            msg.message_type === "call_offer" ||
            msg.message_type === "call_answer" ||
            msg.message_type === "ice_candidate"
          ) {
            if (!userId) return;

            if (msg.sender_id !== userId && msg.receiver_id !== userId) return;

            setSignalingState((prev) => {
              const remoteId =
                msg.sender_id === userId ? msg.receiver_id : msg.sender_id;

              const participants = Array.from(
                new Set([...prev.participants, remoteId].filter(Boolean))
              );

              const next = { ...prev, participants };

              if (msg.message_type === "call_offer") {
                next.isCaller = msg.sender_id === userId;
              }

              if (msg.message_type === "call_offer" && msg.metadata?.offer) {
                next.offers = {
                  ...prev.offers,
                  [remoteId]: msg.metadata.offer,
                };
              }

              if (msg.message_type === "call_answer" && msg.metadata?.answer) {
                next.answers = {
                  ...prev.answers,
                  [remoteId]: msg.metadata.answer,
                };
              }

              if (msg.message_type === "ice_candidate" && msg.metadata?.candidate) {
                const existing = prev.candidates[remoteId] || [];
                next.candidates = {
                  ...prev.candidates,
                  [remoteId]: [...existing, msg.metadata.candidate],
                };
              }

              return next;
            });

            // ⭐ AUTO-OPEN CALL MODAL FOR CALLEE (FIRST OFFER ONLY)
            if (msg.message_type === "call_offer") {
              if (msg.sender_id !== userId) {
                if (!callActive) {
                  setSignalingState(prev => ({
                    ...prev,
                    isCaller: false,
                  }));

                  setCallActive(true);
                  setCallModalOpen(true);
                }
              }
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

  // ⭐ MARK SEEN WHEN THREAD IS OPEN
  useEffect(() => {
    if (!userId) return;

    const activeRoomId = finalRoomId;
    if (!activeRoomId) return;

    async function markSeen() {
      await supabase
        .from("room_participants")
        .update({ last_seen: new Date().toISOString() })
        .eq("room_id", activeRoomId)
        .eq("user_id", userId);
    }

    markSeen();
  }, [userId, finalRoomId]);

  // ⭐ SEND MESSAGE
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

  function joinCall() {
    resetSignaling();
    setCallModalOpen(true);
  }

  // ⭐⭐⭐ STEP 3 — START CALL (NEW)
  async function startCall() {
    if (!otherUserId) return;

    await supabase.from("call_events").insert({
      room_id: finalRoomId,
      caller_id: userId,
      target_user_id: otherUserId,
    });

    router.push(`/call/${finalRoomId}`);
  }

  // ⭐ You will add the call button in part 2 (UI section)

  async function startGroupCall() {
    const inferredParticipants = Array.from(
      new Set(
        messages
          .map((m) => m.sender_id)
          .filter((id: string) => id && id !== userId)
      )
    );

    resetSignaling();

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

  // ⭐ STATUS LABEL
  function getStatusLabel(msg: any) {
    if (msg.seen_at) return "Seen";
    if (msg.delivered_at) return "Delivered";
    return "Sent";
  }

  return (
    <div className="flex flex-col h-full bg-neutral-950">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900 sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Room</span>
          <span className="text-xs text-neutral-400">{finalRoomId}</span>
        </div>

        <div className="flex gap-2">
          {/* ⭐ NEW: 1-to-1 Call Button */}
          {otherUserId && (
            <button
              onClick={startCall}
              className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-500"
            >
              Call
            </button>
          )}

          {/* Existing Group Call Button */}
          <button
            onClick={startGroupCall}
            className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-500"
          >
            Start Group Call
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, index) => {
          const isOutgoing = m.sender_id === userId;
          const isLastOutgoing =
            isOutgoing &&
            messages.filter((x) => x.sender_id === userId).slice(-1)[0]?.id === m.id;

          return (
            <div key={m.id} className="bg-neutral-800 p-3 rounded-lg">
              <div className="text-xs font-semibold text-yellow-400">
                {usernames[m.sender_id] || m.sender_id}
              </div>
              <div className="text-sm mt-1">{m.content}</div>

              {isLastOutgoing && (
                <div className="text-right text-xs text-neutral-400 mt-1">
                  {getStatusLabel(m)}
                </div>
              )}
            </div>
          );
        })}

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

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={callModalOpen}
        callActive={callActive}
        onClose={() => {
          setCallModalOpen(false);
          setCallActive(false);
          resetSignaling();
        }}
        signaling={signalingState}
        onSendOffer={signalingState.sendOffer}
        onSendAnswer={signalingState.sendAnswer}
        onSendCandidate={signalingState.sendCandidate}
        onNotify={(msg) => console.log("NOTIFY:", msg)}
      />
    </div>
  );
}
