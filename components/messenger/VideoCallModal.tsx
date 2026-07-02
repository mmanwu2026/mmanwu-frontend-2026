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
    // add your TURN here if needed
  ],
};

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
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
  const remoteVideoRefs = useRef<Record<ParticipantId, HTMLVideoElement | null>>(
    {}
  );
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<ParticipantId, RTCPeerConnection>>(
    {}
  );

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

    stream.getTracks().forEach((track) => {
      console.log("attachTracksToPC: adding track", track);
      pc.addTrack(track, stream);
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
    const { participants } = signaling;
    console.log("startCallAsCaller participants:", participants);

    await setupLocalStream();

    onNotify("Call started");
    console.log("NOTIFICATION: Call started");

    for (const participantId of participants) {
      console.log("startCallAsCaller: creating/using PC for", participantId);
      const pc = createPeerConnection(participantId);

      // Only create an offer if we are the caller and we don't already have one
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

  const handleIncomingAnswer = async (
    from: ParticipantId,
    answer: RTCSessionDescriptionInit
  ) => {
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
  };

  const handleIncomingCandidate = async (
    from: ParticipantId,
    candidate: RTCIceCandidateInit
  ) => {
    console.log("handleIncomingCandidate CALLED from", from, candidate);
    let pc = peerConnectionsRef.current[from];
    if (!pc) {
      console.warn("handleIncomingCandidate: NO PC FOUND for", from, "— creating PC now");
      pc = createPeerConnection(from);
    }
    console.log("handleIncomingCandidate: adding ICE candidate");
    try {
      await pc.addIceCandidate(candidate);
    } catch (err) {
      console.error("handleIncomingCandidate: addIceCandidate ERROR for", from, err);
    }
  };

  const handleIncomingOffer = async (
    from: ParticipantId,
    offer: RTCSessionDescriptionInit
  ) => {
    console.log("handleIncomingOffer CALLED from", from, offer);
    await setupLocalStream();
    const pc = createPeerConnection(from);

    console.log("handleIncomingOffer: setting remote description");
    await pc.setRemoteDescription(offer);

    console.log("handleIncomingOffer: creating answer for", from);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log("handleIncomingOffer: LOCAL DESCRIPTION SET for", from);
    onSendAnswer(from, answer);
    console.log("handleIncomingOffer: ANSWER SENT to", from);
  };

  // ---------- EFFECTS ----------

  useEffect(() => {
    if (!isOpen) {
      console.log("VideoCallModal NOT OPEN");
      return;
    }
    console.log("VideoCallModal effect RUN", signaling);

    // Ensure local media is ready
    setupLocalStream();

    // Caller starts call once when modal opens
    if (signaling.isCaller) {
      console.log("EFFECT: Caller starting call (participants may have changed)");
      startCallAsCaller();
    }
  }, [isOpen]); // only on open/close

  useEffect(() => {
    if (!isOpen) {
      console.log("VideoCallModal effect: isOpen FALSE");
      return;
    }

    console.log("VideoCallModal effect RUN (signaling change)", signaling);

    // Offers
    Object.entries(signaling.offers).forEach(([from, offer]) => {
      console.log("EFFECT sees OFFER from", from);
      if (!signaling.isCaller) {
        handleIncomingOffer(from, offer);
      }
    });

    // Answers
    Object.entries(signaling.answers).forEach(([from, answer]) => {
      console.log("EFFECT sees ANSWER from", from);
      if (signaling.isCaller) {
        handleIncomingAnswer(from, answer);
      }
    });

    // Candidates
    Object.entries(signaling.candidates).forEach(([from, candList]) => {
      console.log("EFFECT sees CANDIDATES from", from, candList);
      candList.forEach((cand) => handleIncomingCandidate(from, cand));
    });
  }, [isOpen, signaling]);

  // ---------- UI CONTROLS ----------

  const toggleSpeaker = (participantId: ParticipantId) => {
    console.log("Toggle speaker");
    const remoteVideos = document.querySelectorAll<HTMLVideoElement>(
      `video[data-remote-id="${participantId}"]`
    );
    const currentlyMuted = speakerMuted[participantId] ?? false;
    remoteVideos.forEach((v) => {
      v.muted = !currentlyMuted;
    });
    setSpeakerMuted((prev) => ({
      ...prev,
      [participantId]: !currentlyMuted,
    }));
    console.log(
      "Speaker toggle for",
      `remote-${participantId}`,
      "muted:",
      !currentlyMuted
    );
  };

  const toggleCamera = () => {
    console.log("Toggle camera");
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;
    const newEnabled = !videoTrack.enabled;
    videoTrack.enabled = newEnabled;
    setCameraOn(newEnabled);
  };

  const toggleMic = () => {
    console.log("Toggle mic");
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;
    const newEnabled = !audioTrack.enabled;
    audioTrack.enabled = newEnabled;
    setMicOn(newEnabled);
  };

  const handleClose = () => {
    console.log("VideoCallModal CLOSE");
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="video-call-modal">
      <div className="video-call-header">
        <span>Group Call</span>
        <button onClick={handleClose}>Close</button>
      </div>

      <div className="video-call-body">
        <div className="local-video-container">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="local-video"
          />
          <div className="controls">
            <button onClick={toggleCamera}>
              {cameraOn ? "Turn Camera Off" : "Turn Camera On"}
            </button>
            <button onClick={toggleMic}>
              {micOn ? "Mute Mic" : "Unmute Mic"}
            </button>
          </div>
        </div>

        <div className="remote-videos-container">
          {signaling.participants.map((pId) => (
            <div key={pId} className="remote-video-wrapper">
              <video
                ref={(el) => {
                  remoteVideoRefs.current[pId] = el;
                }}
                data-remote-id={pId}
                autoPlay
                playsInline
                className="remote-video"
              />
              <div className="remote-controls">
                <span>{pId}</span>
                <button onClick={() => toggleSpeaker(pId)}>
                  {speakerMuted[pId] ? "Unmute" : "Mute"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
