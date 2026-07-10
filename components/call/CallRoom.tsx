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
  type: "offer" | "answer" | "candidate";
  payload: any;
  created_at: string;
};

type CallEventRow = {
  id: string;
  type: "incoming_call" | "call_declined" | string;
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

  console.log("DEBUG → userId:", userId);
  console.log("DEBUG → roomId:", roomId);
  console.log("DEBUG → role:", role);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const pendingRemoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const [joined, setJoined] = useState(false);
  const hasSentOfferRef = useRef(false);
  const hasProcessedOfferRef = useRef(false);

  // ⭐ Caller-side call status (now includes decline)
  const [callStatus, setCallStatus] = useState<
    "ringing" | "connecting" | "declined" | "active"
  >(role === "caller" ? "ringing" : "connecting");

  // Create PeerConnection
  useEffect(() => {
    console.log("PC DEBUG → creating RTCPeerConnection");

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
      console.log("ICE DEBUG → candidate:", event.candidate);

      if (!event.candidate) return;

      if (!userId || !roomId) {
        console.warn("ICE DEBUG → Skipping ICE candidate insert: userId or roomId undefined");
        return;
      }

      try {
        const res: PostgrestResponse<any> = await supabase
          .from("call_signaling")
          .insert({
            room_id: roomId,
            sender_id: userId,
            type: "candidate",
            payload: event.candidate.toJSON(),
          });
        console.log("ICE DEBUG → insert result:", res);
      } catch (err) {
        console.error("ICE DEBUG → insert error:", err);
      }
    };

    pc.ontrack = (event) => {
      console.log("TRACK DEBUG → ontrack fired:", event.streams, "track:", event.track);

      const el = remoteVideoRef.current;

      if (!pendingRemoteStreamRef.current) {
        pendingRemoteStreamRef.current = new MediaStream();
      }

      pendingRemoteStreamRef.current.addTrack(event.track);

      if (!el) {
        console.log("TRACK DEBUG → remote video element not ready, keeping merged stream buffered");
        return;
      }

      el.srcObject = pendingRemoteStreamRef.current;

      const tryPlay = () => {
        el.play().catch((err) => {
          console.warn("TRACK DEBUG → play() blocked, retrying:", err);
          setTimeout(tryPlay, 250);
        });
      };

      tryPlay();

      // ⭐ Remote track means call is active
      console.log("CALL STATUS DEBUG → remote track received, setting status to active");
      setCallStatus("active");
    };

    return () => {
      console.log("PC DEBUG → closing RTCPeerConnection");
      pc.close();
      pcRef.current = null;
    };
  }, [roomId, userId, supabase, role]);

  async function joinCall() {
    console.log("JOIN DEBUG → joinCall invoked");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    console.log("JOIN DEBUG → got local stream:", stream);

    const pc = pcRef.current;
    stream.getTracks().forEach((track) => {
      console.log("JOIN DEBUG → adding track:", track);
      pc?.addTrack(track, stream);
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current
        .play()
        .catch((e) => console.warn("JOIN DEBUG → local play error:", e));
    }

    // Safari remote playback retry after user gesture
    setTimeout(() => {
      const el = remoteVideoRef.current;
      if (el?.srcObject) {
        el.play().catch((e) => console.warn("Safari retry play error:", e));
      }
    }, 500);

    setJoined(true);

    // Forced-offer logic: do NOT rely on negotiationneeded
    if (role === "caller" && !hasSentOfferRef.current) {
      hasSentOfferRef.current = true;

      console.log("OFFER DEBUG → creating offer (forced path)");

      // Force Safari (and others) to flush internal state
      await pc!.getStats();

      const offer = await pc!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc!.setLocalDescription(offer);

      console.log("OFFER DEBUG → localDescription set:", offer);

      if (!userId || !roomId) {
        console.warn("OFFER DEBUG → Skipping offer insert: userId or roomId undefined");
        return;
      }

      try {
        const res: PostgrestResponse<any> = await supabase
          .from("call_signaling")
          .insert({
            room_id: roomId,
            sender_id: userId,
            type: "offer",
            payload: {
              sdp: offer.sdp,
              type: offer.type,
            },
          });
        console.log("OFFER DEBUG → insert result:", res);
      } catch (err) {
        console.error("OFFER DEBUG → insert error:", err);
      }
    }
  }

  // Realtime signaling (offer/answer/candidates)
  useEffect(() => {
    console.log("RT DEBUG → subscribing to signaling channel:", roomId);

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
          console.log("RT DEBUG → received signaling payload:", payload);

          const row = payload.new;
          const pc = pcRef.current;

          if (!pc) {
            console.warn("RT DEBUG → pcRef.current is null");
            return;
          }

          if (row.sender_id === userId) {
            console.log("RT DEBUG → ignoring own signaling row");
            return;
          }

          // ⭐ Caller listens for callee answer → "connecting"
          if (role === "caller" && row.type === "answer") {
            console.log("CALL STATUS DEBUG → callee answered, setting status to connecting");
            setCallStatus("connecting");
          }

          // Callee: process offer → create answer
          if (row.type === "offer" && role === "callee" && !hasProcessedOfferRef.current) {
            console.log("RT DEBUG → processing offer");

            hasProcessedOfferRef.current = true;

            const offerPayload = row.payload as { sdp: string; type: "offer" };

            await pc.setRemoteDescription(
              new RTCSessionDescription({
                type: offerPayload.type,
                sdp: offerPayload.sdp,
              })
            );

            console.log("RT DEBUG → remoteDescription set (callee)");

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log("RT DEBUG → answer created");

            if (!userId || !roomId) {
              console.warn("ANSWER DEBUG → Skipping answer insert: userId or roomId undefined");
              return;
            }

            try {
              const res: PostgrestResponse<any> = await supabase
                .from("call_signaling")
                .insert({
                  room_id: roomId,
                  sender_id: userId,
                  type: "answer",
                  payload: {
                    sdp: answer.sdp,
                    type: answer.type,
                  },
                });
              console.log("ANSWER DEBUG → insert result:", res);
            } catch (err) {
              console.error("ANSWER DEBUG → insert error:", err);
            }
          }

          // Caller: apply answer and then flush buffered candidates
          if (row.type === "answer" && role === "caller") {
            console.log("RT DEBUG → applying answer");

            const answerPayload = row.payload as { sdp: string; type: "answer" };

            await pc.setRemoteDescription(
              new RTCSessionDescription({
                type: answerPayload.type,
                sdp: answerPayload.sdp,
              })
            );

            console.log("RT DEBUG → remoteDescription set from answer (caller)");

            console.log("RT DEBUG → flushing buffered ICE candidates");
            for (const c of pendingCandidatesRef.current) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
                console.log("RT DEBUG → flushed ICE candidate", c);
              } catch (err) {
                console.error("RT DEBUG → error flushing candidate", err);
              }
            }
            pendingCandidatesRef.current = [];
          }

          // Both: buffer/apply candidates
          if (row.type === "candidate") {
            console.log("RT DEBUG → applying ICE candidate");

            const candidateInit = row.payload as RTCIceCandidateInit;

            if (!pc.remoteDescription) {
              console.warn(
                "RT DEBUG → remoteDescription is null, buffering ICE candidate",
                candidateInit
              );
              pendingCandidatesRef.current.push(candidateInit);
              return;
            }

            const candidate = new RTCIceCandidate(candidateInit);
            await pc.addIceCandidate(candidate);

            console.log("RT DEBUG → ICE candidate added");
          }
        }
      )
      .subscribe();

    return () => {
      console.log("RT DEBUG → unsubscribing signaling channel");
      supabase.removeChannel(channel);
    };
  }, [roomId, userId, role, supabase]);

  // ⭐ NEW: caller-side decline detection via call_events
  useEffect(() => {
    if (role !== "caller") {
      console.log("CALL EVENTS DEBUG → not caller, skipping call_events subscription");
      return;
    }

    console.log(
      "CALL EVENTS DEBUG → subscribing to call_events for callerId:",
      userId,
      "roomId:",
      roomId
    );

    const eventsChannel = supabase
      .channel(`call-events-${roomId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_events",
          filter: `caller_id=eq.${userId}`,
        },
        async (payload: { new: CallEventRow }) => {
          console.log("CALL EVENTS DEBUG → received payload:", payload);

          const row = payload.new;

          if (row.room_id !== roomId) {
            console.log(
              "CALL EVENTS DEBUG → ignoring event for different room_id:",
              row.room_id,
              "expected:",
              roomId
            );
            return;
          }

          if (row.type === "call_declined") {
            console.log(
              "CALL EVENTS DEBUG → callee declined call, setting callStatus to declined"
            );
            setCallStatus("declined");
          } else {
            console.log("CALL EVENTS DEBUG → non-decline event type:", row.type);
          }
        }
      )
      .subscribe();

    return () => {
      console.log("CALL EVENTS DEBUG → unsubscribing call_events channel");
      supabase.removeChannel(eventsChannel);
    };
  }, [roomId, userId, role, supabase]);

  // Safari delayed remote playback block
  useEffect(() => {
    if (pendingRemoteStreamRef.current && remoteVideoRef.current) {
      console.log("TRACK DEBUG → delayed Safari remote playback init");

      remoteVideoRef.current.srcObject = pendingRemoteStreamRef.current;

      const tryPlay = () => {
        remoteVideoRef.current!.play().catch((err) => {
          console.warn("TRACK DEBUG → delayed Safari play retry:", err);
          setTimeout(tryPlay, 250);
        });
      };

      tryPlay();

      pendingRemoteStreamRef.current = null;
    }
  }, [remoteVideoRef]);

  // Auto-end if declined
  useEffect(() => {
    if (callStatus === "declined") {
      console.log("CALL STATUS DEBUG → callStatus=declined, scheduling endCall");
      setTimeout(() => {
        endCall();
      }, 2000);
    }
  }, [callStatus]);

  function endCall() {
    console.log("END DEBUG → ending call");

    const pc = pcRef.current;
    pc?.close();

    const localStream = localVideoRef.current?.srcObject as MediaStream | null;
    localStream?.getTracks().forEach((t) => {
      console.log("END DEBUG → stopping local track:", t);
      t.stop();
    });

    const remoteStream = remoteVideoRef.current?.srcObject as MediaStream | null;
    remoteStream?.getTracks().forEach((t) => {
      console.log("END DEBUG → stopping remote track:", t);
      t.stop();
    });

    router.push("/messenger");
  }

  return (
    <div className="flex flex-col h-full p-4 text-white">
      {/* ⭐ Caller-side status */}
      {role === "caller" && (
        <div className="text-center text-neutral-300 mb-2">
          {callStatus === "ringing" && "Ringing…"}
          {callStatus === "connecting" && "Connecting…"}
          {callStatus === "declined" && (
            <span className="text-red-400">Call Declined</span>
          )}
          {callStatus === "active" && "Call in progress"}
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
