"use client";

import { useEffect, useRef, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";
import type { PostgrestResponse } from "@supabase/supabase-js";

type Role = "caller" | "callee";

type CallSignalingRow = {
  id: string;
  room_id: string;
  sender_id: string;
  type: "offer" | "answer" | "candidate" | "call_start" | "call_decline";
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

  const role: Role = initialRole ?? "caller";

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const pendingRemoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const [joined, setJoined] = useState(false);
  const hasSentOfferRef = useRef(false);
  const hasProcessedOfferRef = useRef(false);

  const [callDuration, setCallDuration] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  const [incomingCall, setIncomingCall] = useState(false);
  const [ringing, setRinging] = useState(false);

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [joined]);

  function toggleMic() {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !micEnabled));
    setMicEnabled(!micEnabled);
  }

  function toggleCam() {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !camEnabled));
    setCamEnabled(!camEnabled);
  }

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

    pc.onicecandidate = async (event) => {
      if (!event.candidate) return;
      if (!userId || !roomId) return;

      await supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        type: "candidate",
        payload: event.candidate.toJSON(),
      });
    };

    pc.ontrack = (event) => {
      const el = remoteVideoRef.current;

      if (!pendingRemoteStreamRef.current) {
        pendingRemoteStreamRef.current = new MediaStream();
      }

      pendingRemoteStreamRef.current.addTrack(event.track);

      if (!el) return;

      el.srcObject = pendingRemoteStreamRef.current;

      const tryPlay = () => {
        el.play().catch(() => setTimeout(tryPlay, 250));
      };
      tryPlay();
    };

    return () => {
      pc.close();
      pcRef.current = null;
    };
  }, [roomId, userId, supabase, role]);

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

    if (role === "caller" && !hasSentOfferRef.current) {
      hasSentOfferRef.current = true;

      await pc!.getStats();

      const offer = await pc!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
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

  useEffect(() => {
    if (role === "caller") {
      joinCall();

      supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        type: "call_start",
        payload: {},
      });
    }
  }, [role]);

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

          if (row.type === "call_start" && role === "callee") {
            setIncomingCall(true);
            setRinging(true);
          }

          if (row.type === "call_decline") {
            router.push("/messages");
          }

          if (row.type === "offer" && role === "callee" && !hasProcessedOfferRef.current) {
            hasProcessedOfferRef.current = true;

            const offerPayload = row.payload;

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

          if (row.type === "answer" && role === "caller") {
            const answerPayload = row.payload;

            await pc.setRemoteDescription(
              new RTCSessionDescription({
                type: answerPayload.type,
                sdp: answerPayload.sdp,
              })
            );

            for (const c of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            }
            pendingCandidatesRef.current = [];
          }

          if (row.type === "candidate") {
            const candidateInit = row.payload;

            if (!pc.remoteDescription) {
              pendingCandidatesRef.current.push(candidateInit);
              return;
            }

            await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId, role, supabase]);

  useEffect(() => {
    if (pendingRemoteStreamRef.current && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = pendingRemoteStreamRef.current;

      const tryPlay = () => {
        remoteVideoRef.current!.play().catch(() => setTimeout(tryPlay, 250));
      };
      tryPlay();

      pendingRemoteStreamRef.current = null;
    }
  }, [remoteVideoRef]);

  function acceptCall() {
    setIncomingCall(false);
    setRinging(false);
    joinCall();
  }

  function declineCall() {
    supabase.from("call_signaling").insert({
      room_id: roomId,
      sender_id: userId,
      type: "call_decline",
      payload: {},
    });

    router.push("/messages");
  }

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
    <div className="flex flex-col h-full p-4 text-white relative">

      {incomingCall && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-8 text-center px-6">
          <div className="text-4xl md:text-5xl font-extrabold">
            Incoming Call
          </div>
          {ringing && (
            <div className="text-2xl md:text-3xl font-semibold animate-pulse">
              Ringing…
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6 mt-4 w-full md:w-auto justify-center">
            <button
              onClick={acceptCall}
              className="flex-1 md:flex-none px-8 py-4 bg-green-600 rounded-2xl text-2xl md:text-3xl font-bold"
            >
              Accept
            </button>

            <button
              onClick={declineCall}
              className="flex-1 md:flex-none px-8 py-4 bg-red-600 rounded-2xl text-2xl md:text-3xl font-bold"
            >
              Decline
            </button>
          </div>
        </div>
      )}

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

      <div className="mt-4 flex items-center gap-4">
        {joined && (
          <div className="text-lg font-mono">{formatDuration(callDuration)}</div>
        )}

        {joined && (
          <button
            onClick={toggleMic}
            className="px-4 py-2 bg-blue-600 rounded"
          >
            {micEnabled ? "Mute Mic" : "Unmute Mic"}
          </button>
        )}

        {joined && (
          <button
            onClick={toggleCam}
            className="px-4 py-2 bg-yellow-600 rounded"
          >
            {camEnabled ? "Turn Camera Off" : "Turn Camera On"}
          </button>
        )}
      </div>

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
