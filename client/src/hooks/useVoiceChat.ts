import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { RoomMemberPresence } from "./useRoomSocket";

export type VoiceConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface VoicePeer {
  peerId: string;
  name: string;
  volume: number; // 0 - 1
  isSpeaking: boolean;
  pc: RTCPeerConnection;
  stream?: MediaStream;
}

interface UseVoiceChatProps {
  myPeerId: string;
  activeMembers: RoomMemberPresence[];
  sendSignal: (targetPeerId: string, signal: any) => void;
  onSpeakingChange: (isSpeaking: boolean) => void;
  joinVoiceChannel?: (isMuted: boolean) => void;
  leaveVoiceChannel?: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useVoiceChat({
  myPeerId,
  activeMembers,
  sendSignal,
  onSpeakingChange,
  joinVoiceChannel,
  leaveVoiceChannel,
}: UseVoiceChatProps) {
  const [voiceState, setVoiceState] = useState<VoiceConnectionState>("disconnected");
  const [muted, setMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [peerVolumes, setPeerVolumes] = useState<Record<string, number>>({});
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, VoicePeer>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const joinedRef = useRef<boolean>(false);

  // Stable references for external callbacks
  const sendSignalRef = useRef(sendSignal);
  useEffect(() => {
    sendSignalRef.current = sendSignal;
  });

  const onSpeakingChangeRef = useRef(onSpeakingChange);
  useEffect(() => {
    onSpeakingChangeRef.current = onSpeakingChange;
  });

  const joinVoiceChannelRef = useRef(joinVoiceChannel);
  useEffect(() => {
    joinVoiceChannelRef.current = joinVoiceChannel;
  });

  const leaveVoiceChannelRef = useRef(leaveVoiceChannel);
  useEffect(() => {
    leaveVoiceChannelRef.current = leaveVoiceChannel;
  });

  const myPeerIdRef = useRef(myPeerId);
  useEffect(() => {
    myPeerIdRef.current = myPeerId;
  }, [myPeerId]);

  const activeMembersRef = useRef(activeMembers);
  useEffect(() => {
    activeMembersRef.current = activeMembers;
  }, [activeMembers]);

  // Setup local audio level analyzer to detect speaking
  const setupAudioAnalyzer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      const checkSpeaking = () => {
        if (!analyserRef.current || !ctx || !joinedRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);

        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const average = sum / buffer.length;
        const nowSpeaking = average > 18; // Voice detection threshold

        if (nowSpeaking !== wasSpeaking) {
          wasSpeaking = nowSpeaking;
          setIsSpeaking(nowSpeaking);
          onSpeakingChangeRef.current(nowSpeaking);
        }

        animFrameRef.current = requestAnimationFrame(checkSpeaking);
      };

      checkSpeaking();
    } catch (err) {
      console.warn("[Voice] Audio analyzer could not start:", err);
    }
  };

  // Initialize WebRTC Peer Connection with another member
  const createPeerConnection = useCallback(
    (targetPeerId: string, targetName: string, isInitiator: boolean) => {
      if (peersRef.current.has(targetPeerId)) {
        return peersRef.current.get(targetPeerId)!.pc;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);

      // Add local audio tracks if joined
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalRef.current(targetPeerId, {
            type: "candidate",
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        let audio = audioElementsRef.current.get(targetPeerId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audioElementsRef.current.set(targetPeerId, audio);
        }
        audio.srcObject = remoteStream;
        const vol = peerVolumes[targetPeerId] ?? 1.0;
        audio.volume = vol;
      };

      pc.oniceconnectionstatechange = () => {
        if (!joinedRef.current) return;
        if (pc.iceConnectionState === "disconnected") {
          setVoiceState("reconnecting");
          // Attempt graceful ICE restart
          pc.createOffer({ iceRestart: true })
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              sendSignalRef.current(targetPeerId, {
                type: "offer",
                sdp: pc.localDescription,
              });
            })
            .catch(() => {});
        } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setVoiceState("connected");
        }
      };

      const voicePeer: VoicePeer = {
        peerId: targetPeerId,
        name: targetName,
        volume: peerVolumes[targetPeerId] ?? 1.0,
        isSpeaking: false,
        pc,
      };
      peersRef.current.set(targetPeerId, voicePeer);

      if (isInitiator) {
        pc.createOffer({ offerToReceiveAudio: true })
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            sendSignalRef.current(targetPeerId, {
              type: "offer",
              sdp: pc.localDescription,
            });
          })
          .catch((err) => console.warn("[Voice] Error creating offer:", err));
      }

      return pc;
    },
    [peerVolumes]
  );

  // Join Voice Channel
  const joinVoice = useCallback(async () => {
    if (joinedRef.current || voiceState === "connecting") return;

    setVoiceState("connecting");
    setPermissionError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      joinedRef.current = true;
      setVoiceState("connected");
      setMuted(false);
      setupAudioAnalyzer(stream);

      // Notify WebSocket server that we joined voice
      joinVoiceChannelRef.current?.(false);

      // Connect to other members in voice
      const myId = myPeerIdRef.current;
      activeMembersRef.current.forEach((member) => {
        if (member.peerId !== myId) {
          createPeerConnection(member.peerId, member.name, true);
        }
      });

      toast.success("Voice Connected", {
        description: "Speak freely; friends can hear you in real time.",
      });
    } catch (err: any) {
      console.warn("[Voice] Microphone access error:", err);
      joinedRef.current = false;
      setVoiceState("disconnected");

      const isPermissionDenied =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.name === "SecurityError";

      if (isPermissionDenied) {
        setPermissionError("Microphone permission was denied. Please allow microphone access in your browser.");
        toast.error("Microphone permission required", {
          description: "Microphone access is needed to speak. Watch party and chat continue normally.",
        });
      } else {
        toast.error("Could not access microphone", {
          description: "Check your audio input devices.",
        });
      }
    }
  }, [voiceState, createPeerConnection]);

  // Leave Voice Channel
  const leaveVoice = useCallback((isExplicit = false) => {
    if (!joinedRef.current && !localStreamRef.current) {
      return;
    }

    joinedRef.current = false;
    setVoiceState("disconnected");
    setIsSpeaking(false);
    onSpeakingChangeRef.current(false);

    // Stop local media stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {}
      audioContextRef.current = null;
    }

    peersRef.current.forEach((peer) => {
      try {
        peer.pc.close();
      } catch {}
    });
    peersRef.current.clear();

    audioElementsRef.current.forEach((audio) => {
      try {
        audio.srcObject = null;
      } catch {}
    });
    audioElementsRef.current.clear();

    // Notify room server of voice departure
    leaveVoiceChannelRef.current?.();

    if (isExplicit) {
      toast.info("Left voice chat");
    }
  }, []);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current || !joinedRef.current) return;
    const nextMuted = !muted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
    if (nextMuted) {
      setIsSpeaking(false);
      onSpeakingChangeRef.current(false);
    }
  }, [muted]);

  // Handle incoming WebRTC signaling message
  const handleVoiceSignal = useCallback(
    async (senderPeerId: string, senderName: string, signal: any) => {
      if (!joinedRef.current && signal.type === "offer") {
        return;
      }

      let peer = peersRef.current.get(senderPeerId);
      let pc = peer?.pc;

      if (!pc) {
        pc = createPeerConnection(senderPeerId, senderName, false);
      }

      try {
        if (signal.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignalRef.current(senderPeerId, {
            type: "answer",
            sdp: pc.localDescription,
          });
        } else if (signal.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === "candidate" && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.warn("[Voice] Error handling WebRTC signal:", err);
      }
    },
    [createPeerConnection]
  );

  // Set individual participant volume
  const setPeerVolume = useCallback((peerId: string, volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setPeerVolumes((prev) => ({ ...prev, [peerId]: clamped }));
    const audio = audioElementsRef.current.get(peerId);
    if (audio) {
      audio.volume = clamped;
    }
  }, []);

  // Silent cleanup only when unmounting the entire room component
  useEffect(() => {
    return () => {
      if (joinedRef.current) {
        leaveVoice(false);
      }
    };
  }, [leaveVoice]);

  return {
    voiceState,
    joined: voiceState === "connected",
    muted,
    isSpeaking,
    peerVolumes,
    permissionError,
    connectedPeersCount: peersRef.current.size,
    clearPermissionError: () => setPermissionError(null),
    joinVoice,
    leaveVoice: () => leaveVoice(true),
    toggleMute,
    handleVoiceSignal,
    setPeerVolume,
  };
}
