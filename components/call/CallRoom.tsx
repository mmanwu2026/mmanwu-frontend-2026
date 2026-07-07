"use client";

import { useEffect, useRef, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter, useSearchParams } from "next/navigation";

type Role = "caller" | "callee";

type CallSignalingRow = {
  id: string;
  room_id: string;
  sender_id: string;
  type: "offer" | "answer" | "candidate";
  payload: any;
  created_at: string;
};

export default function CallRoom({
  userId,
  roomId,
  role: initialRole,
}: {
  userId: string;
  roomId: string;
  role?: Role;
}) {
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();

  const roleParam = searchParams?.get("role");
const role: Role = initialRole ?? (roleParam === "callee" ? "callee" : "caller");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pendingRemoteStreamRef = useRef<MediaStream | null>(null);

  const [joined, setJoined] = useState(false);
  const hasSentOfferRef = useRef(false);
  const hasProcessedOfferRef = useRef(false);

  // Create PeerConnection
  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          username:
            "dbmO5NTrYER8pb4YZUw0FpIk5NWha3GLI9gbLfQBxOl7oOY2tVBtDiw--g4GrAptAAAAAGpHDhptbWFucGxhemE=",
          credential: "38c296aa-767d-11f1-b766-0242ac140004",
          urls: [
            "turn:us-turn8.xirsys.com:80?transport=udp",
            "turn:us-turn8.xirsys.com:3478?transport=udp",
            "turn:us-turn8.xirsys.com:80?transport=tcp",
            "turn:us-turn8.xirsys.com:3478?transport=tcp",
            "turns:us-turn8.xirsys.com:443?transport=tcp",
            "turns:us-turn8.xirsys.com:5349?transport=tcp",
          ],
        },
      ],
      iceTransportPolicy: "all",
    });

    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;

      supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        type: "candidate",
        payload: event.candidate.toJSON(),
      });
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      const el = remoteVideoRef.current;

      if (!el || !el.isConnected) {
        pendingRemoteStreamRef.current = remoteStream;
        return;
      }

      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }

      el.play().catch(() => {});
      setTimeout(() => el.isConnected && el.play().catch(() => {}), 50);
      setTimeout(() => el.isConnected && el.play().catch(() => {}), 300);
    };

    return () => {
      pc.close();
      pcRef.current = null;
    };
  }, [roomId, userId, supabase]);

  async function joinCall() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    const pc = pcRef.current;
    stream.getTracks().forEach((track) => pc?.addTrack(track, stream));

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }

    setJoined(true);

    // Caller sends offer once joined
    if (role === "caller" && !hasSentOfferRef.current) {
      hasSentOfferRef.current = true;
      const offer = await pc!.createOffer();
      await pc!.setLocalDescription(offer);

      await supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        type: "offer",
        payload: {
          sdp: offer.sdp,
          type: offer.type,
        },
      });
    }
  }

  // Realtime signaling: offers, answers, candidates
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
        async (payload: { new: CallSignalingRow }) => {
          const row = payload.new;
          const pc = pcRef.current;

          if (!pc) return;
          if (row.sender_id === userId) return;

          // Callee: process offer, create answer
          if (row.type === "offer" && role === "callee" && !hasProcessedOfferRef.current) {
            hasProcessedOfferRef.current = true;

            const offerPayload = row.payload as { sdp: string; type: "offer" };

            await pc.setRemoteDescription(
              new RTCSessionDescription({
                type: offerPayload.type,
                sdp: offerPayload.sdp,
              })
            );

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await supabase.from("call_signaling").insert({
              room_id: roomId,
              sender_id: userId,
              type: "answer",
              payload: {
                sdp: answer.sdp,
                type: answer.type,
              },
            });
          }

          // Caller: apply answer
          if (row.type === "answer" && role === "caller") {
            const answerPayload = row.payload as { sdp: string; type: "answer" };

            await pc.setRemoteDescription(
              new RTCSessionDescription({
                type: answerPayload.type,
                sdp: answerPayload.sdp,
              })
            );
          }

          // Both: apply candidates
          if (row.type === "candidate") {
            const candidateInit = row.payload as RTCIceCandidateInit;
            const candidate = new RTCIceCandidate(candidateInit);
            await pc.addIceCandidate(candidate);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId, role, supabase]);

  // Attach buffered remote stream once DOM is ready
  useEffect(() => {
    const el = remoteVideoRef.current;
    const stream = pendingRemoteStreamRef.current;

    if (el && el.isConnected && stream) {
      el.srcObject = stream;

      el.play().catch(() => {});
      setTimeout(() => el.isConnected && el.play().catch(() => {}), 50);
      setTimeout(() => el.isConnected && el.play().catch(() => {}), 300);

      pendingRemoteStreamRef.current = null;
    }
  });

  function endCall() {
    const pc = pcRef.current;
    pc?.close();

    const localStream = localVideoRef.current?.srcObject as MediaStream | null;
    localStream?.getTracks().forEach((t) => t.stop());

    const remoteStream = remoteVideoRef.current?.srcObject as MediaStream | null;
    remoteStream?.getTracks().forEach((t) => t.stop());

    router.push("/messages");
  }

  return (
    <div className="flex flex-col h-full p-4 text-white">
      <div className="flex gap-4">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-1/2 bg-black rounded-lg"
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-1/2 bg-black rounded-lg"
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
