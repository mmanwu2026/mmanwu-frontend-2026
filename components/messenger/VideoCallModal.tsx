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
        "turns:us-turn1.xirsys.com:5349?transport=tcp"
      ],
      username: "c_bZzzTif6SVAIN6HzYzNujR-POCwcemnWrIJ2dsKelNM4hBXc3kCuHEiD9cfCqXAAAAAGpG5H9tbWFucGxhemE=",
      credential: "6cbf261c-7664-11f1-b615-0242ac140004"
    }
  ]
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
  console.log("VideoCallModal RENDER", { isOpen, signaling });

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<Record<ParticipantId, HTMLVideoElement | null>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<ParticipantId, RTCPeerConnection>>({});
  const pendingCandidatesRef = useRef<Record<ParticipantId, RTCIceCandidateInit[]>>({});

  // guards to prevent repeated processing
  const hasStartedCallRef = useRef(false);
  const handledOffersRef = useRef<Set<string>>(new Set());
  const handledAnswersRef = useRef<Set<string>>(new Set());
  const handledCandidatesRef = useRef<Set<string>>(new Set());

  const [speakerMuted, setSpeakerMuted] = useState<Record<ParticipantId, boolean>>({});
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  // ---------- LOCAL MEDIA ----------

  const setupLocalStream = async () => {
    console.log("setupLocalStream CALLED, localStream:", localStreamRef.current);
    if (localStreamRef.current) {
      console.log("setupLocalStream: localStream already exists");
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current
          .play()
          .then(() => console.log("setupLocalStream: localVideoRef.play() called"))
          .catch((err) =>
            console.error("setupLocalStream: localVideoRef.play() error", err)
          );
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      console.log("setupLocalStream GOT STREAM:", stream);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        console.log("setupLocalStream: attaching stream to localVideoRef");
        localVideoRef.current.srcObject = stream;
        localVideoRef.current
          .play()
          .then(() => console.log("setupLocalStream: localVideoRef.play() called"))
          .catch((err) =>
            console.error("setupLocalStream: localVideoRef.play() error", err)
          );
      }

      onNotify("Camera and microphone started");
      console.log("NOTIFICATION: Camera and microphone started");
    } catch (err) {
      console.error("setupLocalStream ERROR", err);
      onNotify("Failed to start camera/microphone");
    }
  };

  const attachTracksToPC = (pc: RTCPeerConnection, participantId: ParticipantId) => {
    const stream = localStreamRef.current;
    console.log("attachTracksToPC CALLED", { pc, stream });
    if (!stream) {
      console.warn("attachTracksToPC: NO localStreamRef.current");
      return;
    }

    // avoid adding duplicate tracks
    const senders = pc.getSenders();
    const existingTracks = new Set(senders.map((s) => s.track));
    stream.getTracks().forEach((track) => {
      if (!existingTracks.has(track)) {
        console.log("attachTracksToPC: adding track", track);
        pc.addTrack(track, stream);
      } else {
        console.log("attachTracksToPC: track already added", track);
      }
    });
  };

  // ---------- PEER CONNECTION MANAGEMENT ----------

  const createPeerConnection = (participantId: ParticipantId): RTCPeerConnection => {
    console.log("createPeerConnection CALLED for", participantId);

    let existing = peerConnectionsRef.current[participantId];
    if (existing) {
      console.log("createPeerConnection: PC already exists for", participantId);
      return existing;
    }

    const pc = new RTCPeerConnection(iceConfig);
    peerConnectionsRef.current[participantId] = pc;

    console.log("createPeerConnection: creating NEW PC for", participantId);

    pc.onicecandidate = (event) => {
      console.log("onicecandidate FIRED for", participantId, event.candidate);
      if (event.candidate) {
        const candInit: RTCIceCandidateInit = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid ?? undefined,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
          usernameFragment: (event.candidate as any).usernameFragment,
        };
        onSendCandidate(participantId, candInit);
      } else {
        console.log("onicecandidate FIRED for", participantId, "null (end of candidates)");
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE STATE:", participantId, pc.iceConnectionState);
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        console.log("PC STATE:", participantId, pc.connectionState);
        onNotify(`Connection with ${participantId} lost`);
        console.log("NOTIFICATION: Connection with", participantId, "lost");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("PC STATE:", participantId, pc.connectionState);
    };

    pc.ontrack = (event) => {
      console.log("ontrack FIRED for", participantId, event.streams);
      const [remoteStream] = event.streams;
      const videoEl = remoteVideoRefs.current[participantId];
      if (videoEl) {
        videoEl.srcObject = remoteStream;
        videoEl
          .play()
          .then(() => console.log("remote video play() called for", participantId))
          .catch((err) =>
            console.error("remote video play() error for", participantId, err)
          );
      }
    };

    attachTracksToPC(pc, participantId);

    return pc;
  };

  const startCallAsCaller = async () => {
    console.log("startCallAsCaller CALLED");
    if (hasStartedCallRef.current) {
      console.log("startCallAsCaller: already started, skipping");
      return;
    }
    hasStartedCallRef.current = true;

    const { participants } = signaling;
    console.log("startCallAsCaller participants:", participants);

    await setupLocalStream();

    onNotify("Call started");
    console.log("NOTIFICATION: Call started");

    for (const participantId of participants) {
      console.log("startCallAsCaller: creating/using PC for", participantId);
      const pc = createPeerConnection(participantId);

      if (signaling.isCaller && !signaling.offers[participantId]) {
        console.log("startCallAsCaller: creating offer for", participantId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("startCallAsCaller: OFFER CREATED for", participantId, offer);
        console.log("startCallAsCaller: LOCAL DESCRIPTION SET for", participantId);
        onSendOffer(participantId, offer);
        console.log("startCallAsCaller: OFFER SENT to", participantId);
      } else {
        console.log(
          "startCallAsCaller: skipping offer for",
          participantId,
          "isCaller:",
          signaling.isCaller,
          "existingOffer:",
          !!signaling.offers[participantId]
        );
      }
    }
  };

  const handleIncomingOffer = async (
    from: ParticipantId,
    offer: RTCSessionDescriptionInit
  ) => {
    const key = `${from}:${offer.type}:${offer.sdp?.length ?? 0}`;
    if (handledOffersRef.current.has(key)) {
      console.log("handleIncomingOffer: already handled", key);
      return;
    }
    handledOffersRef.current.add(key);

    console.log("handleIncomingOffer CALLED from", from, offer);
    await setupLocalStream();

    const pc = createPeerConnection(from);
    console.log("handleIncomingOffer: setting remote description");
    await pc.setRemoteDescription(offer);

    console.log("handleIncomingOffer: creating answer");
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log("handleIncomingOffer: LOCAL DESCRIPTION SET for", from);
    onSendAnswer(from, answer);
    console.log("handleIncomingOffer: ANSWER SENT to", from);

    const queued = pendingCandidatesRef.current[from] || [];
    if (queued.length) {
      console.log("handleIncomingOffer: flushing queued candidates for", from, queued);
      for (const c of queued) {
        try {
          await pc.addIceCandidate(c);
        } catch (err) {
          console.error("handleIncomingOffer: addIceCandidate (queued) error", err);
        }
      }
      delete pendingCandidatesRef.current[from];
    }
  };

  const handleIncomingAnswer = async (
    from: ParticipantId,
    answer: RTCSessionDescriptionInit
  ) => {
    const key = `${from}:${answer.type}:${answer.sdp?.length ?? 0}`;
    if (handledAnswersRef.current.has(key)) {
      console.log("handleIncomingAnswer: already handled", key);
      return;
    }
    handledAnswersRef.current.add(key);

    console.log("handleIncomingAnswer CALLED from", from, answer);
    const pc = peerConnectionsRef.current[from];
    if (!pc) {
      console.warn("handleIncomingAnswer: NO PC FOUND for", from);
      return;
    }
    console.log("handleIncomingAnswer: setting remote description");
    await pc.setRemoteDescription(answer);
    onNotify(`Answer received from ${from}`);
    console.log("NOTIFICATION: Answer received from", from);

    const queued = pendingCandidatesRef.current[from] || [];
    if (queued.length) {
      console.log("handleIncomingAnswer: flushing queued candidates for", from, queued);
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
      console.log("handleIncomingCandidate: already handled", key);
      return;
    }
    handledCandidatesRef.current.add(key);

    console.log("handleIncomingCandidate CALLED from", from, candidateInit);
    const pc = peerConnectionsRef.current[from];

    if (!pc || !pc.remoteDescription) {
      console.warn(
        "handleIncomingCandidate: NO PC or remoteDescription null for",
        from,
        "– queueing candidate"
      );
      const existing = pendingCandidatesRef.current[from] || [];
      pendingCandidatesRef.current[from] = [...existing, candidateInit];
      return;
    }

    try {
      await pc.addIceCandidate(candidateInit);
      console.log("handleIncomingCandidate: addIceCandidate SUCCESS for", from);
    } catch (err) {
      console.error("handleIncomingCandidate: addIceCandidate ERROR for", from, err);
    }
  };

  // ---------- EFFECTS ----------

  useEffect(() => {
    if (!isOpen) {
      console.log("VideoCallModal effect: isOpen FALSE");
      return;
    }

    console.log("VideoCallModal effect RUN (caller start)", signaling);

    if (signaling.isCaller && signaling.participants.length > 0) {
      console.log("EFFECT: Caller starting call (once)");
      startCallAsCaller();
    }
  }, [isOpen, signaling.isCaller, signaling.participants.length]);

  useEffect(() => {
    if (!isOpen) return;

    console.log("VideoCallModal effect RUN (signaling change)", signaling);

    // Offers (callee side)
    if (!signaling.isCaller) {
      Object.entries(signaling.offers).forEach(([from, offer]) => {
        handleIncomingOffer(from, offer);
      });
    }

    // Answers (caller side)
    if (signaling.isCaller) {
      Object.entries(signaling.answers).forEach(([from, answer]) => {
        handleIncomingAnswer(from, answer);
      });
    }

    // Candidates (both sides)
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

  const handleClose = () => {
    console.log("handleClose CALLED – tearing down PCs and streams");

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

    onClose();
  };

  if (!isOpen) return null;

  const participants = signaling.participants;

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
                  }}
                  playsInline
                  className="w-full h-40 bg-black rounded"
                />
                <div className="mt-1 flex gap-2">
                  <button
                    onClick={() => handleToggleSpeaker(pid)}
                    className="px-2 py-1 text-xs rounded bg-neutral-700 text-white hover:bg-neutral-600"
                  >
                    {speakerMuted[pid] ? "Unmute speaker" : "Mute speaker"}
                  </button>
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
