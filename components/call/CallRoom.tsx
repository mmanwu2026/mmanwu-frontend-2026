"use client";

import { useEffect, useRef, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";

export default function CallRoom({
  userId,
  roomId,
}: {
  userId: string;
  roomId: string;
}) {
  const supabase = useSupabase();
  const router = useRouter();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [joined, setJoined] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // ⭐ Step 7.4 — Call Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ⭐ Initialize WebRTC
  useEffect(() => {
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
          target_id: "all",
          type: "candidate",
          payload: event.candidate.toJSON(),
        });
      }
    };

    return () => {
      pc.close();
    };
  }, [roomId, userId, supabase]);

  // ⭐ Get media
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

  // ⭐ Step 7.3 — Leave Detection
  useEffect(() => {
    const handleLeave = async () => {
      await supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        target_id: "all",
        type: "leave",
        payload: {},
      });
    };

    window.addEventListener("beforeunload", handleLeave);
    return () => window.removeEventListener("beforeunload", handleLeave);
  }, [roomId, userId, supabase]);

  // ⭐ Listen for signaling
  useEffect(() => {
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

          // Ignore our own messages
          if (row.sender_id === userId) return;

          // ⭐ Multi-participant readiness
          if (!(row.target_id === "all" || row.target_id === userId)) return;

          if (row.type === "offer") {
            await pcRef.current?.setRemoteDescription(row.payload);
            const answer = await pcRef.current?.createAnswer();
            await pcRef.current?.setLocalDescription(answer);

            await supabase.from("call_signaling").insert({
              room_id: roomId,
              sender_id: userId,
              target_id: row.sender_id,
              type: "answer",
              payload: answer,
            });
          }

          if (row.type === "answer") {
            await pcRef.current?.setRemoteDescription(row.payload);
          }

          if (row.type === "candidate") {
            try {
              await pcRef.current?.addIceCandidate(row.payload);
            } catch (e) {
              console.error("ICE error", e);
            }
          }

          // ⭐ Step 7.3 — Remote user left
          if (row.type === "leave") {
            pcRef.current?.close();
            router.push("/messenger");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId, supabase, router]);

  // ⭐ Caller creates offer
  async function startOffer() {
    const offer = await pcRef.current?.createOffer();
    await pcRef.current?.setLocalDescription(offer);

    await supabase.from("call_signaling").insert({
      room_id: roomId,
      sender_id: userId,
      target_id: "all",
      type: "offer",
      payload: offer,
    });
  }

  // ⭐ Step 7.2 — End Call Button
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

      <div className="text-neutral-300 mt-2">
        Call duration: {Math.floor(seconds / 60)}:
        {String(seconds % 60).padStart(2, "0")}
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
        <>
          <button
            onClick={startOffer}
            className="mt-4 px-4 py-2 bg-blue-600 rounded"
          >
            Start WebRTC Offer
          </button>

          <button
            onClick={endCall}
            className="mt-4 px-4 py-2 bg-red-600 rounded"
          >
            End Call
          </button>
        </>
      )}
    </div>
  );
}
