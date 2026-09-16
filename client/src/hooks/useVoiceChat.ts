import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

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
  activeMembers: { peerId: string; name: string }[];
  sendSignal: (targetPeerId: string, signal: any) => void;
  onSpeakingChange: (isSpeaking: boolean) => void;
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
}: UseVoiceChatProps) {
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [peerVolumes, setPeerVolumes] = useState<Record<string, number>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, VoicePeer>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

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
        if (!analyserRef.current || !ctx) return;
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
          onSpeakingChange(nowSpeaking);
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
          sendSignal(targetPeerId, {
            type: "candidate",
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        // Create audio playback element
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
            sendSignal(targetPeerId, {
              type: "offer",
              sdp: pc.localDescription,
            });
          })
          .catch((err) => console.warn("[Voice] Error creating offer:", err));
      }

      return pc;
    },
    [sendSignal, peerVolumes]
  );

  // Join Voice Channel
  const joinVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      setJoined(true);
      setMuted(false);
      setupAudioAnalyzer(stream);

      // Connect to all existing peers in the room
      activeMembers.forEach((member) => {
        if (member.peerId !== myPeerId) {
          createPeerConnection(member.peerId, member.name, true);
        }
      });

      toast.success("Connected to room voice chat", {
        description: "Speak freely; friends will hear you in real time.",
      });
    } catch (err: any) {
      console.warn("[Voice] Microphone access error:", err);
      toast.error("Could not access microphone", {
        description: "Check browser permissions. Watch party & chat will continue normally.",
      });
      setJoined(false);
    }
  }, [activeMembers, myPeerId, createPeerConnection]);

  // Leave Voice Channel
  const leaveVoice = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    peersRef.current.forEach((peer) => peer.pc.close());
    peersRef.current.clear();

    audioElementsRef.current.forEach((audio) => {
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();

    setJoined(false);
    setIsSpeaking(false);
    onSpeakingChange(false);
    toast.info("Left voice chat");
  }, [onSpeakingChange]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextMuted = !muted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
    if (nextMuted) {
      setIsSpeaking(false);
      onSpeakingChange(false);
    }
  }, [muted, onSpeakingChange]);

  // Handle incoming WebRTC signaling message
  const handleVoiceSignal = useCallback(
    async (senderPeerId: string, senderName: string, signal: any) => {
      if (!joined && signal.type === "offer") {
        // Peer is calling us; if not in voice, ignore
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
          sendSignal(senderPeerId, {
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
    [joined, createPeerConnection, sendSignal]
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

  useEffect(() => {
    return () => {
      leaveVoice();
    };
  }, [leaveVoice]);

  return {
    joined,
    muted,
    isSpeaking,
    peerVolumes,
    joinVoice,
    leaveVoice,
    toggleMute,
    handleVoiceSignal,
    setPeerVolume,
  };
}
