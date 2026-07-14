"use client";

import { useEffect, useRef, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { useRouter } from "next/navigation";
import type { PostgrestResponse } from "@supabase/supabase-js";

type Role = "caller" | "callee";

type CallSignalingRow = {
  id: string;
  room_id: string;
  sender_id: string;
  type: "offer" | "answer" | "candidate";
  payload: any;
  created_at: string;
};

type CallEventRow = {
  id: string;
  type: "incoming_call" | "call_declined" | "call_started" | "call_cancelled";
  call_id: string;
  room_id: string;
  caller_id: string;
  target_user_id: string;
  status: string | null;
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
  const { supabase } = useSupabase();
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

  const [callStatus, setCallStatus] = useState<
    "ringing" | "connecting" | "declined" | "active"
  >(role === "caller" ? "ringing" : "connecting");

  // UI state
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const [callTimer, setCallTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [remoteJoined, setRemoteJoined] = useState(false);
  const [remoteLeft, setRemoteLeft] = useState(false);

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showCancelledModal, setShowCancelledModal] = useState(false);

  /* ---------------- PEER CONNECTION SETUP ---------------- */
  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: [
            "turn:us-turn8.xirsys.com:80?transport=udp",
            "turn:us-turn8.xirsys.com:3478?transport=udp",
            "turn:us-turn8.xirsys.com:80?transport=tcp",
            "turn:us-turn8.xirsys.com:3478?transport=tcp",
          ],
          username:
            "dbmO5NTrYER8pb4YZUw0fpIk5NWha3GLI9gbLfQBxOl7oOY2tVBtDiw--g4GrAptAAAAAGpHDhptbWFucGxhemE=",
          credential: "38c296aa-767d-11f1-b766-0242ac140004",
        },
        {
          urls: [
            "turn:global.xirsys.net:3478?transport=udp",
            "turn:global.xirsys.net:3478?transport=tcp",
            "turn:global.xirsys.net:80?transport=udp",
            "turn:global.xirsys.net:80?transport=tcp",
          ],
          username:
            "dbmO5NTrYER8pb4YZUw0fpIk5NWha3GLI9gbLfQBxOl7oOY2tVBtDiw--g4GrAptAAAAAGpHDhptbWFucGxhemE=",
          credential: "38c296aa-767d-11f1-b766-0242ac140004",
        },
      ],
    });

    pcRef.current = pc;

    pc.onicecandidate = async (event) => {
      if (!event.candidate) return;

      await supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        type: "candidate",
        payload: event.candidate.toJSON(),
      });
    };

    pc.ontrack = (event) => {
      if (!pendingRemoteStreamRef.current) {
        pendingRemoteStreamRef.current = new MediaStream();
      }

      pendingRemoteStreamRef.current.addTrack(event.track);

      const el = remoteVideoRef.current;
      if (el) {
        el.srcObject = pendingRemoteStreamRef.current;
        el.play().catch(() => {});
      }

      setCallStatus("active");
      setRemoteJoined(true);
      setRemoteLeft(false);
    };

    return () => {
      pc.close();
      pcRef.current = null;
    };
  }, [roomId, userId, supabase, role]);

  /* ---------------- REMOTE STREAM ATTACH ---------------- */
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;

    if (pendingRemoteStreamRef.current) {
      el.srcObject = pendingRemoteStreamRef.current;
      el.play().catch(() => {});
      pendingRemoteStreamRef.current = null;
    }
  }, [remoteVideoRef.current]);

  /* ---------------- JOIN CALL ---------------- */
  async function joinCall() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
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

    // callee joining → mark call_started
    if (role === "callee") {
      await supabase.from("call_events").insert({
        type: "call_started",
        room_id: roomId,
        caller_id: userId, // you can adjust if needed
        target_user_id: userId,
        call_id: roomId,
        status: "started",
      });
    }

    if (role === "caller" && !hasSentOfferRef.current) {
      hasSentOfferRef.current = true;

      const offer = await pc!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc!.setLocalDescription(offer);

      await supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        type: "offer",
        payload: { sdp: offer.sdp, type: offer.type },
      });
    }
  }

  /* ---------------- SIGNALING SUBSCRIPTION ---------------- */
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

          if (!pc || row.sender_id === userId) return;

          if (role === "caller" && row.type === "answer") {
            setCallStatus("connecting");
            setRemoteJoined(true);

            await pc.setRemoteDescription(
              new RTCSessionDescription(row.payload)
            );

            for (const c of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            }
            pendingCandidatesRef.current = [];
          }

          if (row.type === "offer" && role === "callee" && !hasProcessedOfferRef.current) {
            hasProcessedOfferRef.current = true;

            await pc.setRemoteDescription(
              new RTCSessionDescription(row.payload)
            );

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await supabase.from("call_signaling").insert({
              room_id: roomId,
              sender_id: userId,
              type: "answer",
              payload: { sdp: answer.sdp, type: answer.type },
            });
          }

          if (row.type === "candidate") {
            if (!pc.remoteDescription) {
              pendingCandidatesRef.current.push(row.payload);
              return;
            }

            await pc.addIceCandidate(new RTCIceCandidate(row.payload));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [roomId, userId, role, supabase]);

  /* ---------------- CALL EVENTS (DECLINE + CANCEL + START) ---------------- */

  // Caller-side decline + cancel detection
  useEffect(() => {
    if (role !== "caller") return;

    const eventsChannel = supabase
      .channel(`call-events-caller-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_events",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: { new: CallEventRow }) => {
          const row = payload.new;

          if (row.type === "call_declined") {
            setCallStatus("declined");
          }

          if (row.type === "call_started") {
            setRemoteJoined(true);
            setCallStatus("connecting");
          }

          if (row.type === "call_cancelled") {
            // remote cancelled (unlikely for caller channel, but kept for symmetry)
            setRemoteLeft(true);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(eventsChannel);
  }, [roomId, userId, role, supabase]);

  // Callee-side cancel detection (A2 modal)
  useEffect(() => {
    if (role !== "callee") return;

    const eventsChannel = supabase
      .channel(`call-events-callee-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_events",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: { new: CallEventRow }) => {
          const row = payload.new;

          if (row.type === "call_cancelled") {
            setShowCancelledModal(true);
            setTimeout(() => {
              endCall(true); // silent teardown + redirect
            }, 1500);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(eventsChannel);
  }, [roomId, userId, role, supabase]);

  /* ---------------- AUTO-END IF DECLINED ---------------- */
  useEffect(() => {
    if (callStatus === "declined") {
      setTimeout(() => endCall(true), 1500);
    }
  }, [callStatus]);

  /* ---------------- CALL TIMER ---------------- */
  useEffect(() => {
    if (callStatus === "active") {
      timerRef.current = setInterval(() => {
        setCallTimer((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  /* ---------------- CONTROLS: MUTE / CAMERA / FLIP ---------------- */
  function toggleMute() {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;

    stream.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted(!muted);
  }

  function toggleCamera() {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;

    stream.getVideoTracks().forEach((t) => (t.enabled = cameraOn));
    setCameraOn(!cameraOn);
  }

  async function flipCamera() {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newMode },
      audio: true,
    });

    const pc = pcRef.current;
    pc?.getSenders().forEach((sender) => {
      if (sender.track?.kind === "video") {
        sender.replaceTrack(stream.getVideoTracks()[0]);
      }
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(() => {});
    }
  }

  /* ---------------- CANCEL CALL (CALLER, RINGING ONLY) ---------------- */
  async function cancelCall() {
    if (role !== "caller") return;
    if (callStatus !== "ringing" && callStatus !== "connecting") return;

    await supabase.from("call_events").insert({
      type: "call_cancelled",
      room_id: roomId,
      caller_id: userId,
      target_user_id: userId,
      call_id: roomId,
      status: "cancelled",
    });

    endCall(true);
  }

  /* ---------------- END CALL ---------------- */
  function endCall(silent?: boolean) {
    const pc = pcRef.current;
    pc?.close();

    const localStream = localVideoRef.current?.srcObject as MediaStream | null;
    localStream?.getTracks().forEach((t) => t.stop());

    const remoteStream = remoteVideoRef.current?.srcObject as MediaStream | null;
    remoteStream?.getTracks().forEach((t) => t.stop());

    if (!silent) {
      router.push("/messenger");
    } else {
      router.push("/messenger");
    }
  }

  /* ---------------- UI ---------------- */
  const formattedTimer = `${Math.floor(callTimer / 60)
    .toString()
    .padStart(2, "0")}:${(callTimer % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-full p-4 text-white">

      {/* Callee cancel modal (A2) */}
      {showCancelledModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-neutral-900 p-6 rounded-xl text-center border border-neutral-700">
            <p className="text-white mb-4">Caller cancelled the call.</p>
            <p className="text-neutral-400 mb-4">
              Returning to Messenger…
            </p>
          </div>
        </div>
      )}

      {/* Caller-side status + timer */}
      {role === "caller" && (
        <div className="text-center text-neutral-300 mb-4 text-lg">
          {callStatus === "ringing" && "📞 Ringing…"}
          {callStatus === "connecting" && (
            <span className="animate-pulse">🔗 Connecting…</span>
          )}
          {callStatus === "declined" && (
            <span className="text-red-400">❌ Call Declined</span>
          )}
          {callStatus === "active" && (
            <span>
              🟢 Call in progress · <span className="text-sm">{formattedTimer}</span>
            </span>
          )}
        </div>
      )}

      {role === "callee" && (
        <div className="text-center text-neutral-300 mb-4 text-lg">
          {callStatus === "connecting" && (
            <span className="animate-pulse">🔗 Connecting…</span>
          )}
          {callStatus === "active" && (
            <span>
              🟢 Call in progress · <span className="text-sm">{formattedTimer}</span>
            </span>
          )}
        </div>
      )}

      {remoteJoined && !remoteLeft && (
        <div className="text-center text-green-400 mb-2">
          Remote user joined
        </div>
      )}

      {remoteLeft && (
        <div className="text-center text-red-400 mb-2">
        Remote user left
        </div>
      )}

      {/* Video layout */}
      <div
        className="
          flex flex-col md:flex-row
          gap-4
          flex-1
          items-center
          justify-center
        "
      >
        {/* Local video */}
        <div className="relative w-full md:w-1/2 bg-black rounded-lg overflow-hidden">
          <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs">
            You
          </div>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* Remote video */}
        <div className="relative w-full md:w-1/2 bg-black rounded-lg overflow-hidden">
          <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs">
            Remote
          </div>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center mt-6 gap-4">
        <button
          onClick={toggleMute}
          className="px-4 py-3 bg-neutral-800 rounded-full"
        >
          {muted ? "🔇" : "🎤"}
        </button>

        <button
          onClick={toggleCamera}
          className="px-4 py-3 bg-neutral-800 rounded-full"
        >
          {cameraOn ? "📷" : "🚫📷"}
        </button>

        <button
          onClick={flipCamera}
          className="px-4 py-3 bg-neutral-800 rounded-full md:hidden"
        >
          🔄
        </button>

        {callStatus === "ringing" && role === "caller" && (
          <button
            onClick={cancelCall}
            className="px-4 py-3 bg-red-600 rounded-full"
          >
            Cancel
          </button>
        )}

        {callStatus === "active" && (
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-4 py-3 bg-red-600 rounded-full"
          >
            ⛔
          </button>
        )}
      </div>

      {/* End call confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-neutral-900 p-6 rounded-xl text-center border border-neutral-700">
            <p className="text-white mb-4">End the call?</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-4 py-2 bg-neutral-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => endCall(false)}
                className="px-4 py-2 bg-red-600 rounded"
              >
                End Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join button (for both roles) */}
      {!joined && (
        <div className="flex justify-center mt-4">
          <button
            onClick={joinCall}
            className="px-6 py-3 bg-green-600 rounded-lg text-lg hover:bg-green-500"
          >
            Join Call
          </button>
        </div>
      )}
    </div>
  );
}
