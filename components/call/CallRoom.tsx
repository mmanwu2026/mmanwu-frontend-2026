"use client";

import { useEffect, useRef, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";

export default function CallRoom({
  userId,
  roomId,
  callerId,
}: {
  userId: string;
  roomId: string;
  callerId: string;
}) {
  const supabase = useSupabase();
  const router = useRouter();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [joined, setJoined] = useState(false);
  const earlyAnswerRef = useRef<any>(null);

  const isCaller = userId === callerId;

  // Load call event to determine other user
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadCallEvent() {
      const { data } = await supabase
        .from("call_events")
        .select("caller_id, target_user_id")
        .eq("room_id", roomId)
        .single();

      if (!data) return;

      const { caller_id, target_user_id } = data;

      if (userId === caller_id) {
        setOtherUserId(target_user_id);
      } else {
        setOtherUserId(caller_id);
      }
    }

    loadCallEvent();
  }, [roomId, userId, supabase]);

  // Initialize WebRTC
  useEffect(() => {
    if (!otherUserId) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        supabase.from("call_signaling").insert({
          room_id: roomId,
          sender_id: userId,
          target_user_id: otherUserId,
          type: "candidate",
          payload: event.candidate.toJSON(),
        });
      }
    };

    return () => pc.close();
  }, [otherUserId, roomId, userId, supabase]);

  // Join call
  async function joinCall() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    stream.getTracks().forEach((track) => {
      pcRef.current?.addTrack(track, stream);
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    setJoined(true);
  }

  // Caller-only offer creation
  useEffect(() => {
    if (!joined) return;
    if (!isCaller) return;
    if (!otherUserId) return;

    async function startOffer() {
      const pc = pcRef.current;
      if (!pc) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        target_user_id: otherUserId,
        type: "offer",
        payload: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });

      if (earlyAnswerRef.current) {
        await pc.setRemoteDescription(
          new RTCSessionDescription(earlyAnswerRef.current)
        );
        earlyAnswerRef.current = null;
      }
    }

    startOffer();
  }, [joined, isCaller, otherUserId, roomId, userId, supabase]);

  // Signaling listener
  useEffect(() => {
    if (!otherUserId) return;

    const channel = supabase
      .channel(`call-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signaling",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: { new: any }) => {
          const row = payload.new;
          const pc = pcRef.current;

          if (!pc) return;
          if (row.sender_id === userId) return;
          if (row.target_user_id !== userId) return;

          // Callee receives offer
          if (row.type === "offer" && !isCaller) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(row.payload)
            );

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await supabase.from("call_signaling").insert({
              room_id: roomId,
              sender_id: userId,
              target_user_id: row.sender_id,
              type: "answer",
              payload: {
                type: answer.type,
                sdp: answer.sdp,
              },
            });
          }

          // Caller receives answer
          if (row.type === "answer" && isCaller) {
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(
                new RTCSessionDescription(row.payload)
              );
            } else {
              earlyAnswerRef.current = row.payload;
            }
          }

          // ICE candidates
          if (row.type === "candidate") {
            try {
              const candidate = new RTCIceCandidate(row.payload);
              await pc.addIceCandidate(candidate);
            } catch (e) {
              console.error("ICE error", e);
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [otherUserId, isCaller, roomId, userId, supabase]);

  // End call
  async function endCall() {
    await supabase
      .from("call_events")
      .update({ status: "ended" })
      .eq("room_id", roomId);

    pcRef.current?.close();
    router.push("/messenger");
  }

  return (
    <div className="flex flex-col h-full p-4 text-white">
      <div className="flex gap-4">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-1/2 bg-black"
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-1/2 bg-black"
        />
      </div>

      {!joined && (
        <button
          onClick={joinCall}
          className="mt-4 px-4 py-2 bg-green-600 rounded"
        >
          Join Call
        </button>
      )}

      {joined && (
        <button
          onClick={endCall}
          className="mt-4 px-4 py-2 bg-red-600 rounded"
        >
          End Call
        </button>
      )}
    </div>
  );
}
