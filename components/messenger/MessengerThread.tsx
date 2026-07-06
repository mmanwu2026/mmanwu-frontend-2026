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
  const localStreamRef = useRef<MediaStream | null>(null);

  const [joined, setJoined] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [usingFrontCamera, setUsingFrontCamera] = useState(true);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize WebRTC
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

  // Join call (with audio-only option)
  async function joinCall() {
    const constraints: MediaStreamConstraints = audioOnly
      ? { audio: true, video: false }
      : {
          video: {
            facingMode: usingFrontCamera ? "user" : "environment",
          },
          audio: true,
        };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;

    stream.getTracks().forEach((track) => {
      pcRef.current?.addTrack(track, stream);
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    setJoined(true);
  }

  // ICE restart (renegotiation)
  async function restartIce() {
    if (!pcRef.current) return;

    const offer = await pcRef.current.createOffer({ iceRestart: true });
    await pcRef.current.setLocalDescription(offer);

    await supabase.from("call_signaling").insert({
      room_id: roomId,
      sender_id: userId,
      target_id: "all",
      type: "offer",
      payload: offer,
    });
  }

  // Signaling listener
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

          if (row.sender_id === userId) return;
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

  // Caller creates offer
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

  // End call
  async function endCall() {
    await supabase
      .from("call_events")
      .update({ status: "ended" })
      .eq("room_id", roomId);

    pcRef.current?.close();
    router.push("/messenger");
  }

  // Camera toggle
  function toggleCamera() {
    const stream = localStreamRef.current;
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    setCameraOn(videoTrack.enabled);
  }

  // Mic mute
  function toggleMic() {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setMicOn(audioTrack.enabled);
  }

  // Screen sharing
  async function toggleScreenShare() {
    if (!pcRef.current) return;

    if (!screenSharing) {
      const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
      });

      const screenTrack = displayStream.getVideoTracks()[0];
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");

      if (sender && screenTrack) {
        sender.replaceTrack(screenTrack);
        setScreenSharing(true);

        screenTrack.onended = () => {
          if (localStreamRef.current) {
            const originalTrack = localStreamRef.current.getVideoTracks()[0];
            if (originalTrack && sender) {
              sender.replaceTrack(originalTrack);
            }
          }
          setScreenSharing(false);
        };
      }
    } else {
      if (localStreamRef.current) {
        const originalTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = pcRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");

        if (sender && originalTrack) {
          sender.replaceTrack(originalTrack);
        }
      }
      setScreenSharing(false);
    }
  }

  // Audio-only mode (must be set before join)
  function toggleAudioOnly() {
    if (joined) return; // avoid mid-call mode switch
    setAudioOnly((prev) => !prev);
  }

  // Flip camera (mobile)
  async function flipCamera() {
    setUsingFrontCamera((prev) => !prev);

    if (!joined) return;

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: !usingFrontCamera ? "user" : "environment",
      },
      audio: true,
    };

    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = newStream;

    const videoTrack = newStream.getVideoTracks()[0];
    const sender = pcRef.current
      ?.getSenders()
      .find((s) => s.track && s.track.kind === "video");

    if (sender && videoTrack) {
      sender.replaceTrack(videoTrack);
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = newStream;
    }
  }

  return (
    <div className="flex flex-col h-full p-4 text-white bg-neutral-950">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Call Room</span>
          <span className="text-xs text-neutral-400">{roomId}</span>
        </div>
        <div className="text-xs text-neutral-300">
          Duration: {Math.floor(seconds / 60)}:
          {String(seconds % 60).padStart(2, "0")}
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full bg-black rounded-lg object-cover"
          />
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-xs rounded">
            Remote
          </div>
        </div>

        <div className="w-full md:w-1/3 relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-40 md:h-full bg-black rounded-lg object-cover"
          />
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-xs rounded">
            You {audioOnly ? "(Audio only)" : ""}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap gap-2 items-center justify-center">
        {!joined && (
          <>
            <button
              onClick={joinCall}
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 text-sm"
            >
              Join Call
            </button>
            <button
              onClick={toggleAudioOnly}
              className={`px-4 py-2 rounded text-sm ${
                audioOnly ? "bg-yellow-600" : "bg-neutral-700"
              }`}
            >
              {audioOnly ? "Audio Only (On)" : "Audio Only (Off)"}
            </button>
          </>
        )}

        {joined && (
          <>
            <button
              onClick={startOffer}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 text-sm"
            >
              Start WebRTC Offer
            </button>

            <button
              onClick={restartIce}
              className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-500 text-sm"
            >
              Restart ICE
            </button>

            <button
              onClick={toggleCamera}
              className={`px-4 py-2 rounded text-sm ${
                cameraOn ? "bg-neutral-700" : "bg-yellow-700"
              }`}
            >
              {cameraOn ? "Camera On" : "Camera Off"}
            </button>

            <button
              onClick={toggleMic}
              className={`px-4 py-2 rounded text-sm ${
                micOn ? "bg-neutral-700" : "bg-red-700"
              }`}
            >
              {micOn ? "Mic On" : "Mic Muted"}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`px-4 py-2 rounded text-sm ${
                screenSharing ? "bg-orange-600" : "bg-neutral-700"
              }`}
            >
              {screenSharing ? "Stop Screen Share" : "Share Screen"}
            </button>

            <button
              onClick={flipCamera}
              className="px-4 py-2 bg-teal-600 rounded hover:bg-teal-500 text-sm"
            >
              Flip Camera
            </button>

            <button
              onClick={endCall}
              className="px-4 py-2 bg-red-600 rounded hover:bg-red-500 text-sm"
            >
              End Call
            </button>
          </>
        )}
      </div>
    </div>
  );
}
