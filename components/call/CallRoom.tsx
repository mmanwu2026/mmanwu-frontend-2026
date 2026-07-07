"use client";

import { useEffect, useRef, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { useRouter } from "next/navigation";

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

  const [joined, setJoined] = useState(false);

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
        payload: event.candidate.toJSON(), // SCHEMA MATCH
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

      // Old modal triple-play pattern
      el.play().catch(() => {});
      setTimeout(() => el.isConnected && el.play().catch(() => {}), 50);
      setTimeout(() => el.isConnected && el.play().catch(() => {}), 300);
    };

    return () => {
      pc.close();
      pcRef.current = null;
    };
  }, [roomId, userId, role, supabase]);

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
  }

  // Caller creates offer
  useEffect(() => {
    if (!joined || role !== "caller") return;

    async function makeOffer() {
      const pc = pcRef.current;
      if (!pc) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        type: "offer",
        payload: {
          sdp: offer.sdp,
          type: offer.type,
        }, // SCHEMA MATCH
      });
    }

    makeOffer();
  }, [joined, role, roomId, userId, supabase]);

  // Callee polls for offer
  useEffect(() => {
    if (!joined || role !== "callee") return;

    let cancelled = false;

    async function poll() {
      if (cancelled) return;

      const { data } = await supabase
        .from("call_signaling")
        .select("*")
        .eq("room_id", roomId)
        .eq("type", "offer")
        .order("id", { ascending: false })
        .limit(1);

      if (!data || data.length === 0) {
        setTimeout(poll, 500);
        return;
      }

      const row = data[0];
      const parsed = JSON.parse(row.payload); // CRITICAL

      const pc = pcRef.current;
      if (!pc) return;

      await pc.setRemoteDescription(
        new RTCSessionDescription({
          type: parsed.type,
          sdp: parsed.sdp,
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
        }, // SCHEMA MATCH
      });
    }

    poll();
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
        async (payload: { new: any }) => {
          const row = payload.new;
          const pc = pcRef.current;

          if (!pc) return;
          if (row.sender_id === userId) return;

          const parsed = JSON.parse(row.payload); // CRITICAL

          if (row.type === "answer" && role === "caller") {
            await pc.setRemoteDescription(
              new RTCSessionDescription({
                type: parsed.type,
                sdp: parsed.sdp,
              })
            );
          }

          if (row.type === "candidate") {
            const candidate = new RTCIceCandidate(parsed);
            await pc.addIceCandidate(candidate);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId, role, supabase]);

  // Attach buffered remote stream
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

    const local = localVideoRef.current?.srcObject as MediaStream | null;
    local?.getTracks().forEach((t) => t.stop());

    const remote = remoteVideoRef.current?.srcObject as MediaStream | null;
    remote?.getTracks().forEach((t) => t.stop());

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
