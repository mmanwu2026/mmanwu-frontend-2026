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
  signaling: SignalingState;
  onSendOffer: (to: ParticipantId, offer: RTCSessionDescriptionInit) => void;
  onSendAnswer: (to: ParticipantId, answer: RTCSessionDescriptionInit) => void;
  onSendCandidate: (to: ParticipantId, candidate: RTCIceCandidateInit) => void;
  onNotify: (msg: string) => void;
  onClose: () => void;
};

const iceConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: [
        "stun:us-turn1.xirsys.com",
        "turn:us-turn1.xirsys.com:80?transport=udp",
        "turn:us-turn1.xirsys.com:3478?transport=udp",
        "turn:us-turn1.xirsys.com:80?transport=tcp",
        "turn:us-turn1.xirsys.com:3478?transport=tcp",
        "turns:us-turn1.xirsys.com:443?transport=tcp",
        "turns:us-turn1.xirsys.com:5349?transport=tcp",
      ],
      username:
        "c_bZzzTif6SVAIN6HzYzNujR-POCwcemnWrIJ2dsKelNM4hBXc3kCuHEiD9cfCqXAAAAAGpG5H9tbWFucGxhemE=",
      credential: "6cbf261c-7664-11f1-b615-0242ac140004",
    },
  ],
};

const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
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

  const hasStartedCallRef = useRef(false);
  const handledOffersRef = useRef<Set<string>>(new Set());
  const handledAnswersRef = useRef<Set<string>>(new Set());
  const handledCandidatesRef = useRef<Set<string>>(new Set());

  const [speakerMuted, setSpeakerMuted] = useState<Record<ParticipantId, boolean>>({});
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  // incoming offers that require explicit user answer
  const [incomingOffers, setIncomingOffers] = useState<
    Record<ParticipantId, RTCSessionDescriptionInit>
  >({});

  // ---------- LOCAL MEDIA ----------

  const setupLocalStream = async () => {
    if (localStreamRef.current) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current
          .play()
          .catch((err) => console.error("localVideoRef.play() error", err));
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current
          .play()
          .catch((err) => console.error("localVideoRef.play() error", err));
      }

      onNotify("Camera and microphone started");
    } catch (err) {
      console.error("setupLocalStream ERROR", err);
      onNotify("Failed to start camera/microphone");
    }
  };

  const attachTracksToPC = (pc: RTCPeerConnection, participantId: ParticipantId) => {
    const stream = localStreamRef.current;
    if (!stream) {
      console.warn("attachTracksToPC: NO localStreamRef.current");
      return;
    }

    const senders = pc.getSenders();
    const existingTracks = new Set(senders.map((s) => s.track));
    stream.getTracks().forEach((track) => {
      if (!existingTracks.has(track)) {
        pc.addTrack(track, stream);
      }
    });
  };

  // ---------- PEER CONNECTION MANAGEMENT ----------

  const createPeerConnection = (participantId: ParticipantId): RTCPeerConnection => {
    let existing = peerConnectionsRef.current[participantId];
    if (existing) {
      return existing;
    }

    const pc = new RTCPeerConnection(iceConfig);
    peerConnectionsRef.current[participantId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candInit: RTCIceCandidateInit = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid ?? undefined,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
          usernameFragment: (event.candidate as any).usernameFragment,
        };
        onSendCandidate(participantId, candInit);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        onNotify(`Connection with ${participantId} lost`);
      }
    };

    pc.onconnectionstatechange = () => {
      // silent; no signaling UI
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const videoEl = remoteVideoRefs.current[participantId];
      if (videoEl) {
        videoEl.srcObject = remoteStream;
        videoEl
          .play()
          .catch((err) =>
            console.error("remote video play() error for", participantId, err)
          );
      }
    };

    attachTracksToPC(pc, participantId);

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

      if (signaling.isCaller && !signaling.offers[participantId]) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        onSendOffer(participantId, offer);
      }
    }
  };

  const handleIncomingOffer = async (
    from: ParticipantId,
    offer: RTCSessionDescriptionInit
  ) => {
    const key = `${from}:${offer.type}:${offer.sdp?.length ?? 0}`;
    if (handledOffersRef.current.has(key)) {
      return;
    }
    handledOffersRef.current.add(key);

    await setupLocalStream();

    const pc = createPeerConnection(from);
    await pc.setRemoteDescription(offer);

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
    answer: RTCSessionDescriptionInit
  ) => {
    const key = `${from}:${answer.type}:${answer.sdp?.length ?? 0}`;
    if (handledAnswersRef.current.has(key)) {
      return;
    }
    handledAnswersRef.current.add(key);

    const pc = peerConnectionsRef.current[from];
    if (!pc) {
      console.warn("handleIncomingAnswer: NO PC FOUND for", from);
      return;
    }
    await pc.setRemoteDescription(answer);
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
    candidateInit: RTCIceCandidateInit
  ) => {
    const key = `${from}:${candidateInit.candidate}:${candidateInit.sdpMid ?? ""}:${
      candidateInit.sdpMLineIndex ?? ""
    }`;
    if (handledCandidatesRef.current.has(key)) {
      return;
    }
    handledCandidatesRef.current.add(key);

    const pc = peerConnectionsRef.current[from];

    if (!pc || !pc.remoteDescription) {
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

    if (signaling.isCaller && signaling.participants.length > 0) {
      startCallAsCaller();
    }
  }, [isOpen, signaling.isCaller, signaling.participants.length]);

  useEffect(() => {
    if (!isOpen) return;

    // collect incoming offers for callee, but DO NOT auto-answer
    if (!signaling.isCaller) {
      setIncomingOffers((prev) => {
        const next = { ...prev };
        Object.entries(signaling.offers).forEach(([from, offer]) => {
          if (!next[from]) {
            next[from] = offer;
          }
        });
        return next;
      });
    }

    // answers (caller side)
    if (signaling.isCaller) {
      Object.entries(signaling.answers).forEach(([from, answer]) => {
        handleIncomingAnswer(from, answer);
      });
    }

    // candidates (both sides)
    Object.entries(signaling.candidates).forEach(([from, list]) => {
      list.forEach((c) => handleIncomingCandidate(from, c));
    });
  }, [isOpen, signaling.offers, signaling.answers, signaling.candidates, signaling.isCaller]);

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
      if (videoEl) {
        videoEl.muted = nextMuted;
      }
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

  if (!isOpen) return null;

  const participants = signaling.participants;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-700 rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Video call</span>
            <span className="text-xs text-neutral-400">
              {signaling.isCaller ? "You are calling" : "Incoming call"}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-500 text-white"
          >
            End
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-neutral-900">
          {/* Local video */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">You</span>
            <div className="relative bg-black rounded overflow-hidden h-48 md:h-64">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleToggleMic}
                className="px-3 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-white"
              >
                {micOn ? "Mute mic" : "Unmute mic"}
              </button>
              <button
                onClick={handleToggleCamera}
                className="px-3 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-white"
              >
                {cameraOn ? "Turn camera off" : "Turn camera on"}
              </button>
            </div>
          </div>

          {/* Remote videos */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Participants</span>
            <div className="grid grid-cols-1 gap-3">
              {participants.map((pid) => (
                <div key={pid} className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-300 truncate">
                    Participant: {pid}
                  </span>
                  <div className="relative bg-black rounded overflow-hidden h-40 md:h-52">
                    <video
                      ref={(el) => {
                        remoteVideoRefs.current[pid] = el;
                      }}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                    />
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleToggleSpeaker(pid)}
                      className="px-3 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-white"
                    >
                      {speakerMuted[pid] ? "Unmute speaker" : "Mute speaker"}
                    </button>
                    {!signaling.isCaller && incomingOffers[pid] && (
                      <button
                        onClick={() => handleAnswerClick(pid)}
                        className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        Answer
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {!participants.length && (
                <div className="text-xs text-neutral-500">
                  Waiting for participants…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;
