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

  const [joined, setJoined] = useState(false);

  // Create PeerConnection
  useEffect(() => {
    console.log("🔵 Creating RTCPeerConnection, role:", role);

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
      console.log("🟡 ICE candidate generated:", event.candidate);

      if (event.candidate) {
        supabase.from("call_signaling").insert({
          room_id: roomId,
          sender_id: userId,
          type: "candidate",
          payload: event.candidate.toJSON(),
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("🔵 ICE connection state:", pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log("🟣 Signaling state:", pc.signalingState);
    };

    pc.onicegatheringstatechange = () => {
      console.log("🟠 ICE gathering state:", pc.iceGatheringState);
    };

    pc.ontrack = (event) => {
      console.log("🟢 Remote track received:", event.streams);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return () => pc.close();
  }, [roomId, userId, role, supabase]);

  // Join call
  async function joinCall() {
    console.log("🔵 Joining call, getting media…");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    stream.getTracks().forEach((track) => {
      console.log("🟢 Adding local track:", track.kind);
      pcRef.current?.addTrack(track, stream);
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    setJoined(true);
  }

  // Caller creates offer
  useEffect(() => {
    if (!joined) return;
    if (role !== "caller") return;

    async function makeOffer() {
      const pc = pcRef.current;
      if (!pc) return;

      console.log("🔵 Caller creating offer…");

      const offer = await pc.createOffer();
      console.log("🟣 Offer SDP:", offer.sdp);

      await pc.setLocalDescription(offer);

      await supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        type: "offer",
        payload: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });

      console.log("🟢 Offer sent to Supabase");
    }

    makeOffer();
  }, [joined, role, roomId, userId, supabase]);

  // CALLEE: poll DB until offer exists
  useEffect(() => {
    if (role !== "callee") return;
    if (!joined) return;

    let cancelled = false;

    async function pollForOffer() {
      if (cancelled) return;

      console.log("🔵 Callee checking DB for latest offer…");

      const { data } = await supabase
        .from("call_signaling")
        .select("*")
        .eq("room_id", roomId)
        .eq("type", "offer")
        .order("id", { ascending: false })
        .limit(1);

      if (!data || data.length === 0) {
        console.log("🔴 No offer found in DB yet, will retry…");
        setTimeout(pollForOffer, 1000);
        return;
      }

      const offer = data[0].payload;
      console.log("🟣 Callee loaded offer from DB:", offer);

      const pc = pcRef.current;
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      console.log("🟢 Callee created answer SDP:", answer.sdp);

      await pc.setLocalDescription(answer);

      await supabase.from("call_signaling").insert({
        room_id: roomId,
        sender_id: userId,
        type: "answer",
        payload: {
          type: answer.type,
          sdp: answer.sdp,
        },
      });

      console.log("🟢 Callee sent answer from DB load");
    }

    pollForOffer();

    return () => {
      cancelled = true;
    };
  }, [role, joined, roomId, userId, supabase]);

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

          console.log("🔵 Received signaling:", row);

          if (row.type === "answer" && role === "caller") {
            console.log("🟣 Caller received answer SDP:", row.payload.sdp);

            await pc.setRemoteDescription(
              new RTCSessionDescription(row.payload)
            );
          }

          if (row.type === "candidate") {
            console.log("🟠 Received ICE candidate:", row.payload);

            try {
              const candidate = new RTCIceCandidate(row.payload);
              await pc.addIceCandidate(candidate);
              console.log("🟢 Candidate added");
            } catch (e) {
              console.error("🔴 ICE error:", e);
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [roomId, userId, role, supabase]);

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
    </div>
  );
}
