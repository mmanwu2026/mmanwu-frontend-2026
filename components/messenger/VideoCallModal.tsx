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
  console.log("VideoCallModal RENDER", { isOpen, signaling });

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
    console.log("NOTIFICATION:", msg);
    setNotifications((prev) => [...prev, msg]);
    setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 4000);
  }

async function setupLocalStream(): Promise<MediaStream | null> {
  console.log("setupLocalStream CALLED, localStream:", localStream);

  if (localStream) {
    console.log("setupLocalStream: localStream already exists");
    return localStream;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    console.log("setupLocalStream GOT STREAM:", stream);

    setLocalStream(stream);

    if (localVideoRef.current) {
      console.log("setupLocalStream: attaching stream to localVideoRef");
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      await localVideoRef.current.play();
      console.log("setupLocalStream: localVideoRef.play() called");
    }

    pushNotification("Camera and microphone started");
    return stream;
  } catch (err) {
    console.error("getUserMedia failed", err);
    pushNotification("Could not access camera/microphone");
    return null;
  }
}

  function attachTracksToPC(pc: RTCPeerConnection, stream: MediaStream | null) {
    console.log("attachTracksToPC CALLED", { pc, stream });
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      console.log("attachTracksToPC: adding track", track);
      pc.addTrack(track, stream);
    });
  }

  function createPeerConnection(targetId: string) {
    console.log("createPeerConnection CALLED for", targetId);

    if (peerConnections.current[targetId]) {
      console.log("createPeerConnection: returning existing PC for", targetId);
      return peerConnections.current[targetId];
    }

    console.log("createPeerConnection: creating NEW PC for", targetId);

    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:global.xirsys.net",
            "turn:global.xirsys.net:3478?transport=udp",
            "turn:global.xirsys.net:3478?transport=tcp",
            "turns:global.xirsys.net:443?transport=tcp",
            "turns:global.xirsys.net:5349?transport=tcp",
            "turn:global.xirsys.net:80?transport=udp",
            "turn:global.xirsys.net:80?transport=tcp"
          ],
          username:
            "wkxJr_mEzDbRvQqpHgAeK8kbx0hjeGo6FnV97Vl34YV0RHJPiRX8mgFqNd-KkSi2AAAAAGpFxt1tbWFucGxhemE=",
          credential: "2c2c6cf4-75ba-11f1-ac0b-0242ac140004"
        }
      ]
    });

    pc.oniceconnectionstatechange = () => {
      console.log("ICE STATE:", targetId, pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log("PC STATE:", targetId, pc.connectionState);
    };

    pc.ontrack = (event) => {
      console.log("ontrack FIRED for", targetId, event.streams);
      const remoteVideo = document.getElementById(`remote-${targetId}`) as HTMLVideoElement | null;

      if (remoteVideo) {
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
        remoteVideo.playsInline = true;
        remoteVideo.muted = false;
        remoteVideo.play().catch(() => {});
      }
    };

    pc.onicecandidate = (event) => {
      console.log("onicecandidate FIRED for", targetId, event.candidate);
      if (event.candidate) {
        signaling.sendCandidate(targetId, event.candidate);
      }
    };

    peerConnections.current[targetId] = pc;
    return pc;
  }

async function handleIncomingOffer(fromUser: string, offer: RTCSessionDescriptionInit) {
  console.log("handleIncomingOffer CALLED from", fromUser, offer);

  const stream = await setupLocalStream();
  if (!stream) {
    console.log("handleIncomingOffer: no local stream, aborting");
    return;
  }

  const pc = createPeerConnection(fromUser);

  // ✅ again, use the returned stream
  attachTracksToPC(pc, screenStream || stream);

  console.log("handleIncomingOffer: setting remote description");
  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  console.log("handleIncomingOffer: creating answer");
  const answer = await pc.createAnswer();

  console.log("handleIncomingOffer: setting local description");
  await pc.setLocalDescription(answer);

  signaling.sendAnswer(fromUser, answer);
  console.log("handleIncomingOffer: ANSWER SENT to", fromUser);

  pushNotification(`Incoming call offer from ${fromUser}`);
  setRinging(true);
}

  async function handleIncomingAnswer(fromUser: string, answer: RTCSessionDescriptionInit) {
    console.log("handleIncomingAnswer CALLED from", fromUser, answer);

    const pc = peerConnections.current[fromUser];
    if (!pc) {
      console.log("handleIncomingAnswer: NO PC FOUND for", fromUser);
      return;
    }

    console.log("handleIncomingAnswer: setting remote description");
    await pc.setRemoteDescription(new RTCSessionDescription(answer));

    pushNotification(`Answer received from ${fromUser}`);
  }

  async function handleIncomingCandidate(fromUser: string, candidate: any) {
    console.log("handleIncomingCandidate CALLED from", fromUser, candidate);

    const pc = peerConnections.current[fromUser];
    if (!pc) {
      console.log("handleIncomingCandidate: NO PC FOUND for", fromUser);
      return;
    }

    console.log("handleIncomingCandidate: adding ICE candidate");
    try {
      await pc.addIceCandidate(candidate);
    } catch (err) {
      console.error("Error adding ICE candidate:", err);
    }
  }

 async function startCallAsCaller() {
  console.log("startCallAsCaller CALLED");
  console.log("startCallAsCaller participants:", signaling.participants);

  const stream = await setupLocalStream();
  if (!stream) {
    console.log("startCallAsCaller: no local stream, aborting");
    return;
  }

  if (signaling.logCallEvent) {
    signaling.logCallEvent("call_started");
  }

  pushNotification("Call started");

  for (const targetId of signaling.participants) {
    if (targetId === userId) continue;

    console.log("startCallAsCaller: creating PC for", targetId);

    const pc = createPeerConnection(targetId);

    // ✅ use the stream we just got, not `localStream` (which may still be null)
    attachTracksToPC(pc, screenStream || stream);

    console.log("startCallAsCaller: creating offer for", targetId);
    const offer = await pc.createOffer();
    console.log("startCallAsCaller: OFFER CREATED for", targetId, offer);

    await pc.setLocalDescription(offer);
    console.log("startCallAsCaller: LOCAL DESCRIPTION SET for", targetId);

    signaling.sendOffer(targetId, offer);
    console.log("startCallAsCaller: OFFER SENT to", targetId);
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

      console.log("startScreenShare GOT STREAM:", stream);

      setScreenStream(stream);
      setIsScreenSharing(true);
      pushNotification("Screen sharing started");

      Object.values(peerConnections.current).forEach((pc) => {
        const senders = pc.getSenders().filter((s) => s.track?.kind === "video");
        const screenTrack = stream.getVideoTracks()[0];
        if (senders.length > 0 && screenTrack) {
          console.log("startScreenShare: replacing track");
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
    console.log("stopScreenShare CALLED");

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
          console.log("stopScreenShare: restoring camera track");
          senders[0].replaceTrack(camTrack);
        }
      });
    }
  }

  function endCall() {
    console.log("endCall CALLED");

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

  const hasStartedCallRef = useRef(false);
  const processedOffersRef = useRef(new Set<string>());
  const processedAnswersRef = useRef(new Set<string>());
  const processedCandidatesRef = useRef(new Set<string>());

  useEffect(() => {
    if (!isOpen) {
      console.log("VideoCallModal effect: isOpen FALSE");
      return;
    }

    console.log("VideoCallModal effect RUN", {
      isCaller: signaling.isCaller,
      participants: signaling.participants,
      offers: signaling.offers,
      answers: signaling.answers,
      candidates: signaling.candidates,
    });

    (async () => {
      await setupLocalStream();

      Object.entries(signaling.offers).forEach(([fromUser, offer]) => {
        console.log("EFFECT sees OFFER from", fromUser);
        if (fromUser !== userId && !processedOffersRef.current.has(fromUser)) {
          processedOffersRef.current.add(fromUser);
          handleIncomingOffer(fromUser, offer);
        }
      });

      Object.entries(signaling.answers).forEach(([fromUser, answer]) => {
        console.log("EFFECT sees ANSWER from", fromUser);
        if (fromUser !== userId && !processedAnswersRef.current.has(fromUser)) {
          processedAnswersRef.current.add(fromUser);
          handleIncomingAnswer(fromUser, answer);
        }
      });

      Object.entries(signaling.candidates).forEach(([fromUser, candidateList]) => {
        console.log("EFFECT sees CANDIDATES from", fromUser, candidateList);
        candidateList.forEach((candidate) => {
          const key = `${fromUser}-${candidate.sdpMid}-${candidate.sdpMLineIndex}`;
          if (!processedCandidatesRef.current.has(key)) {
            processedCandidatesRef.current.add(key);
            handleIncomingCandidate(fromUser, candidate);
          }
        });
      });

      if (signaling.isCaller && !hasStartedCallRef.current) {
        console.log("EFFECT: Caller starting call");
        hasStartedCallRef.current = true;
        await startCallAsCaller();
      }
    })();
  }, [
    isOpen,
    signaling.isCaller,
    signaling.offers,
    signaling.answers,
    signaling.candidates,
    userId,
  ]);

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
    console.log("acceptCall CALLED");
    setAccepted(true);
    setRinging(false);
    pushNotification("Call accepted");
  }

  function rejectCall() {
    console.log("rejectCall CALLED");
    setAccepted(false);
    setRinging(false);
    if (signaling.logCallEvent) {
      signaling.logCallEvent("call_missed");
    }
    pushNotification("Call rejected");
    endCall();
  }

  if (!isOpen) {
    console.log("VideoCallModal NOT OPEN");
    return null;
  }

  return (
    <div className="fixed inset-0 bg-neutral-950 flex items-center justify-center z-50">
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

        <div className="flex gap-4 items-center justify-center mt-4">
          <button
            onClick={() => {
              console.log("Toggle mic");
              if (localStream) {
                const audioTrack = localStream.getAudioTracks()[0];
                if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
              }
            }}
            className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white"
          >
            {localStream?.getAudioTracks()[0]?.enabled ? <span>🎤</span> : <span>🔇</span>}
          </button>

          <button
            onClick={() => {
              console.log("Toggle camera");
              if (localStream) {
                const videoTrack = localStream.getVideoTracks()[0];
                if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
              }
            }}
            className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white"
          >
            {localStream?.getVideoTracks()[0]?.enabled ? <span>🎥</span> : <span>📷</span>}
          </button>

                    {/* Toggle Speaker Output */}
          <button
            onClick={() => {
              console.log("Toggle speaker");
              const remoteVideos = document.querySelectorAll("video[id^='remote-']");
              remoteVideos.forEach((v: any) => {
                v.muted = !v.muted;
                console.log("Speaker toggle for", v.id, "muted:", v.muted);
              });
            }}
            className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white"
          >
            <span>🔊</span>
          </button>

          {/* Screen Share */}
          <button
            onClick={startScreenShare}
            className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white"
          >
            {isScreenSharing ? "🛑" : "🖥️"}
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
