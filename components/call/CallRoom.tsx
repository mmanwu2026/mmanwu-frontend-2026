
"use client";

import { useEffect, useRef, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";

type CallSignalingType = "offer" | "answer" | "candidate";

interface IceCandidatePayload extends RTCIceCandidateInit {}

interface SdpPayload extends RTCSessionDescriptionInit {}

interface CallSignalingRow {
  id: number;
  room_id: string;
  sender_id: string;
  type: CallSignalingType;
  payload: SdpPayload | IceCandidatePayload;
  created_at?: string;
}

interface SupabaseRealtimePayload<T> {
  commit_timestamp: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  new: T;
  old: T | null;
}

export default function CallRoom({
  userId,
  roomId,
  role,
}: {
  userId: string;
  roomId: string;
  role: "caller" | "callee";
}) {
  const supabase = useSupabase();
  const router = useRouter();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const pendingRemoteStreamRef = useRef<MediaStream | null>(null);

  const [joined, setJoined] = useState<boolean>(false);

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

    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate) return;

      const candidatePayload: IceCandidatePayload = {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid ?? undefined,
        sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
        usernameFragment: (event.candidate as any).usernameFragment,
      };

      void supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        type: "candidate",
        payload: candidatePayload,
      } satisfies Partial<CallSignalingRow>);
    };

    pc.ontrack = (event: RTCTrackEvent) => {
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
      setTimeout(() => {
        if (el.isConnected) el.play().catch(() => {});
      }, 50);
      setTimeout(() => {
        if (el.isConnected) el.play().catch(() => {});
      }, 300);
    };

    return () => {
      pc.close();
      pcRef.current = null;
    };
  }, [roomId, userId, role, supabase]);

  async function joinCall(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    const pc = pcRef.current;
    if (pc) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }

    setJoined(true);
  }

  // Caller creates offer
  useEffect(() => {
    if (!joined || role !== "caller") return;

    async function makeOffer(): Promise<void> {
      const pc = pcRef.current;
      if (!pc) return;

      const offer: SdpPayload = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        type: "offer",
        payload: offer,
      } satisfies Partial<CallSignalingRow>);
    }

    void makeOffer();
  }, [joined, role, roomId, userId, supabase]);

  // Callee polls for offer
  useEffect(() => {
    if (!joined || role !== "callee") return;

    let cancelled = false;

    async function pollForOffer(): Promise<void> {
      if (cancelled) return;

      const { data } = await supabase
        .from("call_signaling")
        .select("*")
        .eq("room_id", roomId)
        .eq("type", "offer")
        .order("id", { ascending: false })
        .limit(1);

      const rows = data as CallSignalingRow[] | null;

      if (!rows || rows.length === 0) {
        setTimeout(() => void pollForOffer(), 500);
        return;
      }

      const offerRow = rows[0];
      const offer = offerRow.payload as SdpPayload;

      const pc = pcRef.current;
      if (!pc) return;

      await pc.setRemoteDescription(offer);

      const answer: SdpPayload = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        type: "answer",
        payload: answer,
      } satisfies Partial<CallSignalingRow>);
    }

    void pollForOffer();

    return () => {
      cancelled = true;
    };
  }, [joined, role, roomId, userId, supabase]);

  // Realtime listener
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
        async (payload: SupabaseRealtimePayload<CallSignalingRow>) => {
          const row = payload.new;
          const pc = pcRef.current;

          if (!pc) return;
          if (row.sender_id === userId) return;

          if (row.type === "answer" && role === "caller") {
            const answer = row.payload as SdpPayload;
            await pc.setRemoteDescription(answer);
          }

          if (row.type === "candidate") {
            const candidateInit = row.payload as IceCandidatePayload;
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
      setTimeout(() => {
        if (el.isConnected) el.play().catch(() => {});
      }, 50);
      setTimeout(() => {
        if (el.isConnected) el.play().catch(() => {});
      }, 300);

      pendingRemoteStreamRef.current = null;
    }
  });

  function endCall(): void {
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
