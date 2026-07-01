"use client";

import { useEffect, useRef, useState } from "react";

type CallEventType = "call_started" | "call_ended" | "call_missed";

interface SignalingState {
  isCaller: boolean;
  roomId: string;
  participants: string[];
  offers: Record<string, RTCSessionDescriptionInit>;
  answers: Record<string, RTCSessionDescriptionInit>;
  candidates: Record<string, RTCIceCandidate[]>;
  sendOffer: (targetId: string, offer: RTCSessionDescriptionInit) => Promise<void>;
  sendAnswer: (targetId: string, answer: RTCSessionDescriptionInit) => Promise<void>;
  sendCandidate: (targetId: string, candidate: RTCIceCandidate) => Promise<void>;
  logCallEvent?: (type: CallEventType) => Promise<void>;
}

export default function VideoCallModal({
  isOpen,
  onCloseAction,
  signaling,
  userId,
  roomId,
}: {
  isOpen: boolean;
  onCloseAction: () => void;
  signaling: SignalingState;
  userId: string;
  roomId: string;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [ringing, setRinging] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

  function pushNotification(msg: string) {
    setNotifications((prev) => [...prev, msg]);
    setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 4000);
  }

  async function setupLocalStream() {
  if (localStream) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setLocalStream(stream);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    pushNotification("Camera and microphone started");
  } catch (err) {
    console.error("getUserMedia failed", err);
    pushNotification("Could not access camera/microphone");
  }
}

  function attachTracksToPC(pc: RTCPeerConnection, stream: MediaStream | null) {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
  }

  function createPeerConnection(targetId: string) {
    if (peerConnections.current[targetId]) {
      return peerConnections.current[targetId];
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:global.turn.twilio.com:3478?transport=udp",
          username: "example-user",
          credential: "example-pass",
        },
      ],
    });

    attachTracksToPC(pc, screenStream || localStream);

    pc.ontrack = (event) => {
      const remoteVideo = document.getElementById(
        `remote-${targetId}`
      ) as HTMLVideoElement;

      if (remoteVideo) {
        remoteVideo.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signaling.sendCandidate(targetId, event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        pushNotification(`Connection with ${targetId} lost`);
      }
    };

    peerConnections.current[targetId] = pc;
    return pc;
  }

  async function handleIncomingOffer(fromUser: string, offer: RTCSessionDescriptionInit) {
    const pc = createPeerConnection(fromUser);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    signaling.sendAnswer(fromUser, answer);
    pushNotification(`Incoming call offer from ${fromUser}`);
    setRinging(true);
  }

  async function handleIncomingAnswer(fromUser: string, answer: RTCSessionDescriptionInit) {
    const pc = peerConnections.current[fromUser];
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    pushNotification(`Answer received from ${fromUser}`);
  }

  async function handleIncomingCandidate(fromUser: string, candidate: RTCIceCandidate) {
    const pc = peerConnections.current[fromUser];
    if (!pc) return;

    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  async function startCallAsCaller() {
    await setupLocalStream();

    if (signaling.logCallEvent) {
      signaling.logCallEvent("call_started");
    }

    pushNotification("Call started");

    for (const targetId of signaling.participants) {
      const pc = createPeerConnection(targetId);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      signaling.sendOffer(targetId, offer);
    }
  }

  async function toggleAudioOnly() {
    setIsAudioOnly((prev) => {
      const next = !prev;
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      pushNotification(next ? "Audio-only mode enabled" : "Video enabled");
      return next;
    });
  }

  async function startScreenShare() {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      setScreenStream(stream);
      setIsScreenSharing(true);
      pushNotification("Screen sharing started");

      Object.values(peerConnections.current).forEach((pc) => {
        const senders = pc.getSenders().filter((s) => s.track?.kind === "video");
        const screenTrack = stream.getVideoTracks()[0];
        if (senders.length > 0 && screenTrack) {
          senders[0].replaceTrack(screenTrack);
        }
      });

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopScreenShare();
      });
    } catch {
      pushNotification("Screen sharing failed");
    }
  }

  function stopScreenShare() {
    if (!isScreenSharing) return;

    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setIsScreenSharing(false);
    pushNotification("Screen sharing stopped");

    if (localStream) {
      Object.values(peerConnections.current).forEach((pc) => {
        const senders = pc.getSenders().filter((s) => s.track?.kind === "video");
        const camTrack = localStream.getVideoTracks()[0];
        if (senders.length > 0 && camTrack) {
          senders[0].replaceTrack(camTrack);
        }
      });
    }
  }

  function endCall() {
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};

    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());

    setLocalStream(null);
    setScreenStream(null);
    setIsScreenSharing(false);
    setIsAudioOnly(false);
    setRinging(false);
    setAccepted(false);

    if (signaling.logCallEvent) {
      signaling.logCallEvent("call_ended");
    }

    pushNotification("Call ended");
    onCloseAction();
  }

  // Process signaling updates incrementally
const hasStartedCallRef = useRef(false);
const processedOffersRef = useRef(new Set());
const processedAnswersRef = useRef(new Set());
const processedCandidatesRef = useRef(new Set());

useEffect(() => {
  if (!isOpen) return;

  (async () => {
    await setupLocalStream();

    // ⭐ Process incoming OFFERS once
    Object.entries(signaling.offers).forEach(([fromUser, offer]) => {
      if (fromUser !== userId && !processedOffersRef.current.has(fromUser)) {
        processedOffersRef.current.add(fromUser);
        handleIncomingOffer(fromUser, offer);
      }
    });

    // ⭐ Process incoming ANSWERS once
    Object.entries(signaling.answers).forEach(([fromUser, answer]) => {
      if (!processedAnswersRef.current.has(fromUser)) {
        processedAnswersRef.current.add(fromUser);
        handleIncomingAnswer(fromUser, answer);
      }
    });

    // ⭐ Process incoming ICE CANDIDATES once
    Object.entries(signaling.candidates).forEach(([fromUser, candidateList]) => {
      candidateList.forEach((candidate) => {
        const key = `${fromUser}-${candidate.sdpMid}-${candidate.sdpMLineIndex}`;
        if (!processedCandidatesRef.current.has(key)) {
          processedCandidatesRef.current.add(key);
          handleIncomingCandidate(fromUser, candidate);
        }
      });
    });

    // ⭐ Start call ONCE for caller
    if (signaling.isCaller && !hasStartedCallRef.current) {
      hasStartedCallRef.current = true;
      await startCallAsCaller();
    }
  })();
}, [isOpen, signaling.isCaller]);

  const participantCount = signaling.participants.length;
  const gridCols =
    participantCount <= 1
      ? "grid-cols-1"
      : participantCount <= 2
      ? "grid-cols-2"
      : participantCount <= 4
      ? "grid-cols-2"
      : "grid-cols-3";

  function acceptCall() {
    setAccepted(true);
    setRinging(false);
    pushNotification("Call accepted");
  }

  function rejectCall() {
    setAccepted(false);
    setRinging(false);
    if (signaling.logCallEvent) {
      signaling.logCallEvent("call_missed");
    }
    pushNotification("Call rejected");
    endCall();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg shadow-xl w-full max-w-5xl p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-white text-lg">Room call — {roomId}</h2>
          <button
            onClick={endCall}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500 text-sm"
          >
            End Call
          </button>
        </div>

        {ringing && !accepted && (
          <div className="flex items-center justify-between bg-yellow-900/40 border border-yellow-600 rounded p-3">
            <span className="text-yellow-100 text-sm">Incoming call…</span>
            <div className="flex gap-2">
              <button
                onClick={acceptCall}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-500"
              >
                Accept
              </button>
              <button
                onClick={rejectCall}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        <div className={`grid gap-3 ${gridCols}`}>
          <div className="bg-black rounded relative">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover rounded"
            />
            <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">
              You
            </span>
          </div>

          {signaling.participants
            .filter((p) => p !== userId)
            .map((p) => (
              <div key={p} className="bg-black rounded relative">
                <video
                  id={`remote-${p}`}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded"
                />
                <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">
                  {p}
                </span>
              </div>
            ))}
        </div>

        <div className="flex gap-3 items-center mt-2">
          <button
            onClick={toggleAudioOnly}
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
          >
            {isAudioOnly ? "Enable Video" : "Audio-only mode"}
          </button>
          <button
            onClick={startScreenShare}
            className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-500"
          >
            {isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          </button>
        </div>

        {notifications.length > 0 && (
          <div className="fixed bottom-4 right-4 space-y-2">
            {notifications.map((n, idx) => (
              <div
                key={idx}
                className="bg-neutral-800 text-white text-xs px-3 py-2 rounded shadow"
              >
                {n}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
