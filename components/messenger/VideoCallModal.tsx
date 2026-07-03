import React, { useEffect, useRef, useState } from "react";

type ParticipantId = string;

type SignalingState = {
  isCaller: boolean;
  participants: ParticipantId[];
  offers: Record<ParticipantId, RTCSessionDescriptionInit>;
  answers: Record<ParticipantId, RTCSessionDescriptionInit>;
  candidates: Record<ParticipantId, RTCIceCandidateInit[]>;
};

type VideoCallModalProps = {
  isOpen: boolean;
  callActive: boolean;
  signaling: SignalingState;
  onSendOffer: (to: ParticipantId, offer: RTCSessionDescriptionInit) => void;
  onSendAnswer: (to: ParticipantId, answer: RTCSessionDescriptionInit) => void;
  onSendCandidate: (to: ParticipantId, candidate: RTCIceCandidateInit) => void;
  onNotify: (msg: string) => void;
  onClose: () => void;
};

const iceConfig: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:us-turn8.xirsys.com"] },
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
  iceTransportPolicy: "relay",
};

const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  callActive,
  signaling,
  onSendOffer,
  onSendAnswer,
  onSendCandidate,
  onNotify,
  onClose,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<Record<ParticipantId, HTMLVideoElement | null>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<ParticipantId, RTCPeerConnection>>({});
  const pendingCandidatesRef = useRef<Record<ParticipantId, RTCIceCandidateInit[]>>({});
  const pendingRemoteStreamsRef = useRef<Record<ParticipantId, MediaStream>>({});

  const hasStartedCallRef = useRef(false);
  const handledOffersRef = useRef<Set<string>>(new Set());
  const handledAnswersRef = useRef<Set<string>>(new Set());
  const handledCandidatesRef = useRef<Set<string>>(new Set());

  const [speakerMuted, setSpeakerMuted] = useState<Record<ParticipantId, boolean>>({});
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const [incomingOffers, setIncomingOffers] = useState<
    Record<ParticipantId, RTCSessionDescriptionInit>
  >({});

 // ---------- LOCAL MEDIA ----------

const setupLocalStream = async () => {
  // If we already have a stream, just reattach it safely
  if (localStreamRef.current) {
    if (localVideoRef.current && localVideoRef.current.isConnected) {
      localVideoRef.current.srcObject = localStreamRef.current;
      try {
        localVideoRef.current.play();
      } catch (err) {
        console.warn("LOCAL: video play error (existing stream)", err);
      }
    }
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    localStreamRef.current = stream;

    if (localVideoRef.current && localVideoRef.current.isConnected) {
      localVideoRef.current.srcObject = stream;
      try {
        localVideoRef.current.play();
      } catch (err) {
        console.warn("LOCAL: video play error (new stream)", err);
      }
    }

    onNotify("Camera and microphone started");
  } catch (err) {
    console.error("setupLocalStream ERROR", err);
    onNotify("Failed to start camera/microphone");
  }
};

const attachTracksToPC = (pc: RTCPeerConnection, participantId: ParticipantId) => {
  const stream = localStreamRef.current;
  console.log("attachTracksToPC for", participantId, "stream:", stream);

  if (!stream) {
    console.warn("attachTracksToPC: NO localStreamRef.current");
    return;
  }

  const senders = pc.getSenders();
  const existingTracks = new Set(senders.map((s) => s.track));

  stream.getTracks().forEach((track) => {
    console.log("adding track", track.kind, "to", participantId);
    if (!existingTracks.has(track)) {
      pc.addTrack(track, stream);
    }
  });
};

  // ---------- CALLER-ONLY ICE RESTART ----------

  const restartIceForParticipant = async (participantId: ParticipantId) => {
    if (!signaling.isCaller) return;

    const pc = peerConnectionsRef.current[participantId];
    if (!pc) return;

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      onSendOffer(participantId, offer);
      onNotify(`ICE restart offer sent to ${participantId}`);
    } catch (err) {
      console.error("restartIceForParticipant ERROR", participantId, err);
      onNotify(`Failed to restart ICE with ${participantId}`);
    }
  };

  // ---------- PEER CONNECTION MANAGEMENT ----------

  const createPeerConnection = (participantId: ParticipantId): RTCPeerConnection => {
    let existing = peerConnectionsRef.current[participantId];
    if (existing) return existing;

    const pc = new RTCPeerConnection(iceConfig);
    peerConnectionsRef.current[participantId] = pc;

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const candInit: RTCIceCandidateInit = {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid ?? undefined,
        sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
        usernameFragment: (event.candidate as any).usernameFragment,
      };
      onSendCandidate(participantId, candInit);
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("PC ICE STATE for", participantId, "=>", state);

      if (state === "failed" || state === "disconnected") {
        onNotify(`Connection with ${participantId} ${state}`);
        restartIceForParticipant(participantId);
      }
    };

    pc.ontrack = (event) => {
      console.log("CALLER: ontrack fired for", participantId, "streams:", event.streams);
      const [remoteStream] = event.streams;
      const videoEl = remoteVideoRefs.current[participantId];

      if (!videoEl || !videoEl.isConnected) {
        console.warn(
          "CALLER: no connected video element for",
          participantId,
          "— buffering stream"
        );
        pendingRemoteStreamsRef.current[participantId] = remoteStream;
        return;
      }

      videoEl.srcObject = remoteStream;

      setTimeout(() => {
        const el = remoteVideoRefs.current[participantId];
        if (!isOpen || !el || !el.isConnected) return;
        try {
          el.play();
        } catch (err) {
          console.warn("CALLER: video play error (50ms)", err);
        }
      }, 50);

      setTimeout(() => {
        const el = remoteVideoRefs.current[participantId];
        if (!isOpen || !el || !el.isConnected) return;
        try {
          el.play();
        } catch (err) {
          console.warn("CALLER: video play error (300ms)", err);
        }
      }, 300);
    };

    return pc;
  };

  const startCallAsCaller = async () => {
    if (hasStartedCallRef.current) return;
    hasStartedCallRef.current = true;

    const { participants } = signaling;

    await setupLocalStream();
    onNotify("Call started");

    for (const participantId of participants) {
      const pc = createPeerConnection(participantId);

      // add tracks first, then create offer
      attachTracksToPC(pc, participantId);

      if (signaling.isCaller && !signaling.offers[participantId]) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        onSendOffer(participantId, offer);
      }
    }
  };

  const handleIncomingOffer = async (
    from: ParticipantId,
    offer: RTCSessionDescriptionInit,
  ) => {
    const key = `${from}:${offer.type}:${offer.sdp?.length ?? 0}`;
    if (handledOffersRef.current.has(key)) return;
    handledOffersRef.current.add(key);

    await setupLocalStream();

    let pc = peerConnectionsRef.current[from];
    if (!pc) pc = createPeerConnection(from);

    await pc.setRemoteDescription(offer);
    attachTracksToPC(pc, from);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    onSendAnswer(from, answer);

    const queued = pendingCandidatesRef.current[from] || [];
    if (queued.length) {
      for (const c of queued) {
        try {
          await pc.addIceCandidate(c);
        } catch (err) {
          console.error("handleIncomingOffer: addIceCandidate (queued) error", err);
        }
      }
      delete pendingCandidatesRef.current[from];
    }

    onNotify(`Call answered for ${from}`);
  };

  const handleIncomingAnswer = async (
    from: ParticipantId,
    answer: RTCSessionDescriptionInit,
  ) => {
    const key = `${from}:${answer.type}:${answer.sdp?.length ?? 0}`;
    if (handledAnswersRef.current.has(key)) return;
    handledAnswersRef.current.add(key);

    let pc = peerConnectionsRef.current[from];
    if (!pc) {
      console.warn("handleIncomingAnswer: NO PC FOUND for", from, "— recreating");
      pc = createPeerConnection(from);
    }

    try {
      await pc.setRemoteDescription(answer);
      console.log(
        "CALLER: setRemoteDescription(success) for",
        from,
        "ICE state:",
        pc.iceConnectionState
      );
    } catch (err) {
      console.error("handleIncomingAnswer: setRemoteDescription ERROR", err);
      return;
    }

    onNotify(`Answer received from ${from}`);

    const queued = pendingCandidatesRef.current[from] || [];
    if (queued.length) {
      for (const c of queued) {
        try {
          await pc.addIceCandidate(c);
        } catch (err) {
          console.error("handleIncomingAnswer: addIceCandidate (queued) error", err);
        }
      }
      delete pendingCandidatesRef.current[from];
    }
  };

  const handleIncomingCandidate = async (
    from: ParticipantId,
    candidateInit: RTCIceCandidateInit,
  ) => {
    console.log("REMOTE ICE candidate for", from, "=>", candidateInit);

    const key = `${from}:${candidateInit.candidate}:${candidateInit.sdpMid ?? ""}:${candidateInit.sdpMLineIndex ?? ""}`;
    if (handledCandidatesRef.current.has(key)) return;
    handledCandidatesRef.current.add(key);

    let pc = peerConnectionsRef.current[from];
    if (!pc) pc = createPeerConnection(from);

    if (!pc.remoteDescription) {
      const existing = pendingCandidatesRef.current[from] || [];
      pendingCandidatesRef.current[from] = [...existing, candidateInit];
      return;
    }

    try {
      await pc.addIceCandidate(candidateInit);
    } catch (err) {
      console.error("handleIncomingCandidate: addIceCandidate ERROR for", from, err);
    }
  };

  // ---------- EFFECTS ----------

useEffect(() => {
  if (!isOpen) return;
  if (!signaling.isCaller) return;

  // Wait until participants actually exist
  if (signaling.participants.length === 0) return;

  // Prevent early or duplicate call starts
  if (hasStartedCallRef.current) return;

  startCallAsCaller();
}, [isOpen, signaling.isCaller, signaling.participants.length]);

useEffect(() => {
  if (!isOpen) return;

  // CALLEE LOGIC
  if (!signaling.isCaller) {
    setIncomingOffers((prev) => {
      const next = { ...prev };
      Object.entries(signaling.offers).forEach(([from, offer]) => {
        if (!next[from]) next[from] = offer;
      });
      return next;
    });

    if (callActive) {
      Object.entries(signaling.offers).forEach(([from, offer]) => {
        handleIncomingOffer(from, offer);
      });
    }
  }

  // CALLER LOGIC
  if (signaling.isCaller) {
    Object.entries(signaling.answers).forEach(([from, answer]) => {
      handleIncomingAnswer(from, answer);
    });
  }

  // ICE CANDIDATES
  Object.entries(signaling.candidates).forEach(([from, list]) => {
    list.forEach((c) => handleIncomingCandidate(from, c));
  });
}, [
  isOpen,
  signaling.offers,
  signaling.answers,
  signaling.candidates,
  signaling.isCaller,
  callActive,
]);

  useEffect(() => {
    console.log("VideoCallModal sees signaling.offers:", signaling.offers);
  }, [signaling.offers]);

  useEffect(() => {
    console.log("VideoCallModal incomingOffers:", incomingOffers);
  }, [incomingOffers]);

  // ---------- CONTROLS & CLEANUP ----------

  const handleToggleMic = () => {
    setMicOn((prev) => {
      const next = !prev;
      const stream = localStreamRef.current;
      if (stream) {
        stream.getAudioTracks().forEach((t) => (t.enabled = next));
      }
      return next;
    });
  };

  const handleToggleCamera = () => {
    setCameraOn((prev) => {
      const next = !prev;
      const stream = localStreamRef.current;
      if (stream) {
        stream.getVideoTracks().forEach((t) => (t.enabled = next));
      }
      return next;
    });
  };

  const handleToggleSpeaker = (participantId: ParticipantId) => {
    setSpeakerMuted((prev) => {
      const nextMuted = !prev[participantId];
      const videoEl = remoteVideoRefs.current[participantId];
      if (videoEl) videoEl.muted = nextMuted;
      return { ...prev, [participantId]: nextMuted };
    });
  };

  const handleAnswerClick = async (participantId: ParticipantId) => {
    const offer = incomingOffers[participantId];
    if (!offer) return;

    await handleIncomingOffer(participantId, offer);

    setIncomingOffers((prev) => {
      const next = { ...prev };
      delete next[participantId];
      return next;
    });
  };

  const handleClose = () => {
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      try {
        pc.close();
      } catch (err) {
        console.error("Error closing PC", err);
      }
    });
    peerConnectionsRef.current = {};

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    pendingCandidatesRef.current = {};
    pendingRemoteStreamsRef.current = {};
    handledOffersRef.current.clear();
    handledAnswersRef.current.clear();
    handledCandidatesRef.current.clear();
    hasStartedCallRef.current = false;

    setSpeakerMuted({});
    setCameraOn(true);
    setMicOn(true);
    setIncomingOffers({});

    onClose();
  };

  // ---------- PARTICIPANTS ----------

  const participants = signaling.isCaller
    ? signaling.participants
    : Object.keys(incomingOffers).length > 0
      ? Object.keys(incomingOffers)
      : Object.keys(peerConnectionsRef.current);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    console.log("CALLER participants array:", participants);
  }, [participants]);

  if (!isOpen) return null;

  // ---------- UI ----------

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-neutral-900 rounded-lg shadow-lg p-4 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-white">Video Call</h2>
          <button
            onClick={handleClose}
            className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-500 text-white"
          >
            End Call
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex flex-col">
            <span className="text-xs text-neutral-300 mb-1">You</span>
            <video
              ref={localVideoRef}
              muted
              playsInline
              autoPlay
              className="w-full h-64 bg-black rounded"
            />
          </div>

          <div className="flex flex-col space-y-2">
            {participants.length === 0 && (
              <div className="w-full h-64 bg-neutral-800 rounded flex items-center justify-center text-neutral-400 text-sm">
                Waiting for participants…
              </div>
            )}

            {participants.map((pid) => (
              <div key={pid} className="flex flex-col">
                <span className="text-xs text-neutral-300 mb-1">
                  Participant: {pid}
                </span>

                <video
                  ref={(el) => {
                    remoteVideoRefs.current[pid] = el;

                    const stream = pendingRemoteStreamsRef.current[pid];
                    if (el && el.isConnected && stream) {
                      console.log("ATTACHING buffered stream for", pid);
                      el.srcObject = stream;
                      try {
                        el.play();
                      } catch (err) {
                        console.warn("CALLER: video play error (ref attach)", err);
                      }
                      delete pendingRemoteStreamsRef.current[pid];
                    }
                  }}
                  muted={isMobile}
                  playsInline
                  autoPlay
                  className="w-full h-40 bg-black rounded"
                />

                <div className="mt-1 flex gap-2">
                  <button
                    onClick={() => handleToggleSpeaker(pid)}
                    className="px-2 py-1 text-xs rounded bg-neutral-700 text-white hover:bg-neutral-600"
                  >
                    {speakerMuted[pid] ? "Unmute speaker" : "Mute speaker"}
                  </button>

                  {!signaling.isCaller && incomingOffers[pid] && (
                    <button
                      onClick={() => handleAnswerClick(pid)}
                      className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
                    >
                      Answer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-center mt-2">
          <button
            onClick={handleToggleMic}
            className="px-3 py-1 text-sm rounded bg-neutral-700 text-white hover:bg-neutral-600"
          >
            {micOn ? "Mute mic" : "Unmute mic"}
          </button>
          <button
            onClick={handleToggleCamera}
            className="px-3 py-1 text-sm rounded bg-neutral-700 text-white hover:bg-neutral-600"
          >
            {cameraOn ? "Turn camera off" : "Turn camera on"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;
