"use client";

import { useEffect, useState } from "react";
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
  if (!roomId) {
    console.error("Missing roomId");
    return null;
  }

  const supabase = useSupabase();   // ⭐ FIXED

  const finalRoomId = roomId;

  const searchParams = useSearchParams();
  const isIncoming = searchParams ? searchParams.get("incoming") === "1" : false;

  const [messages, setMessages] = useState<any[]>([]);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callActive, setCallActive] = useState(false);

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

    const last = data?.[data.length - 1];
    if (last?.message_type === "call_offer") {
      setCallActive(true);
    }
  }

  useEffect(() => {
    if (isIncoming) {
      setCallActive(true);
      setCallModalOpen(true);
    }
  }, [isIncoming]);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`room-${finalRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${finalRoomId}`,
        },
        (payload: any) => {
          const msg = payload.new;
          setMessages((prev) => [...prev, msg]);

          const fromUser = msg.sender_id;

          setSignalingState((prev) => {
            if (!prev.participants.includes(fromUser)) {
              return {
                ...prev,
                participants: [...prev.participants, fromUser],
              };
            }
            return prev;
          });

          if (msg.message_type === "call_offer") {
            setCallActive(true);

            if (fromUser !== userId) {
              setCallModalOpen(true);
            }

            setSignalingState((prev) => ({
              ...prev,
              isCaller: fromUser === userId,
              offers: {
                ...prev.offers,
                [fromUser]: msg.metadata.offer,
              },
            }));
          }

          if (msg.message_type === "call_answer") {
            setSignalingState((prev) => ({
              ...prev,
              answers: {
                ...prev.answers,
                [fromUser]: msg.metadata.answer,
              },
            }));
          }

          if (msg.message_type === "ice_candidate") {
            setSignalingState((prev) => ({
              ...prev,
              candidates: {
                ...prev.candidates,
                [fromUser]: [
                  ...(prev.candidates[fromUser] || []),
                  msg.metadata.candidate,
                ],
              },
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [finalRoomId, userId]);

  function joinCall() {
    setCallModalOpen(true);
  }

  async function startGroupCall() {
    setCallActive(true);
    setCallModalOpen(true);
    setSignalingState((prev) => ({
      ...prev,
      isCaller: true,
    }));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className="mb-2 text-white">
            <strong>{m.sender_id}</strong>: {m.content}
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

      <div className="p-4 border-t border-neutral-700">
        <button
          onClick={startGroupCall}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          Start Group Call
        </button>
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
