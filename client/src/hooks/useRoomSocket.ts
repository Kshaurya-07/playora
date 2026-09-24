import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { classifyDrift, DriftStatus } from "@shared/watch-party";
import { toast } from "sonner";

export interface SocketUser {
  id: number;
  name: string;
  avatarColor: string;
}

export interface RoomMemberPresence {
  peerId: string;
  userId: number;
  name: string;
  avatarColor: string;
  role: "host" | "moderator" | "participant";
  isMuted: boolean;
  isSpeaking: boolean;
  isVoiceActive?: boolean;
  connectionStatus?: "connected" | "reconnecting";
  watchingPosition: number;
}

export interface ChatMessageItem {
  id: number;
  eventId?: string;
  roomId: number;
  userId: number;
  senderName: string;
  senderColor: string;
  content: string;
  messageType: "chat" | "system";
  createdAt: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentPosition: number;
  serverTime: number;
}

export interface QueueItem {
  id: string;
  url: string;
  title: string;
  platform: string;
  platformName: string;
  addedBy: string;
}

export interface UseRoomSocketProps {
  roomCode: string;
  user: SocketUser;
  platform?: string;
  contentUrl?: string;
  onPlaybackSync?: (state: { eventType: string; position: number; isPlaying: boolean; initiatedBy: string }) => void;
  onVoiceSignal?: (senderPeerId: string, senderName: string, signal: any) => void;
  onCountdownTick?: (count: number, message: string) => void;
  onContentChanged?: (data: { contentUrl: string; platform: string; title: string }) => void;
  onKicked?: (message: string) => void;
}

export type RoomConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";
export type RoomMembershipState = "IDLE" | "JOINING" | "JOINED" | "LEAVING" | "LEFT";

export function useRoomSocket({
  roomCode,
  user,
  platform,
  contentUrl,
  onPlaybackSync,
  onVoiceSignal,
  onCountdownTick,
  onContentChanged,
  onKicked,
}: UseRoomSocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<RoomConnectionStatus>("connecting");
  const [peerId, setPeerId] = useState<string>("");
  const [role, setRole] = useState<"host" | "moderator" | "participant">("participant");
  const [members, setMembers] = useState<RoomMemberPresence[]>([]);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [activeReaction, setActiveReaction] = useState<{ emoji: string; id: number } | null>(null);
  const [clockOffset, setClockOffset] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(20);
  const [roomPlayback, setRoomPlayback] = useState<PlaybackState>({
    isPlaying: false,
    currentPosition: 0,
    serverTime: Date.now(),
  });
  const [localDrift, setLocalDrift] = useState<number>(0);
  const [driftStatus, setDriftStatus] = useState<DriftStatus>("synced");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [roomContent, setRoomContent] = useState<{ contentUrl: string; platform: string; title: string } | null>(null);
  const [roomSettings, setRoomSettings] = useState<any>({
    hostOnlyControls: true,
    lockSeeking: false,
    allowReactions: true,
    allowVoice: true,
  });

  // Stable references to prevent callback changes from triggering reconnects
  const callbacksRef = useRef({
    onPlaybackSync,
    onVoiceSignal,
    onCountdownTick,
    onContentChanged,
    onKicked,
  });
  useEffect(() => {
    callbacksRef.current = {
      onPlaybackSync,
      onVoiceSignal,
      onCountdownTick,
      onContentChanged,
      onKicked,
    };
  });

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const platformRef = useRef(platform);
  useEffect(() => {
    platformRef.current = platform;
  }, [platform]);

  const contentUrlRef = useRef(contentUrl);
  useEffect(() => {
    contentUrlRef.current = contentUrl;
  }, [contentUrl]);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef(false);
  const membershipStateRef = useRef<RoomMembershipState>("IDLE");
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  // NTP Clock Ping
  const pingClock = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "clock_ping",
          clientTime: Date.now(),
        })
      );
    }
  }, []);

  const connect = useCallback(() => {
    if (!roomCode || isUnmountingRef.current) return;
    if (membershipStateRef.current === "LEAVING" || membershipStateRef.current === "LEFT") return;

    // Close any previous socket cleanly if still around
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socketUrl = `${protocol}//${host}/api/ws`;

    membershipStateRef.current = "JOINING";
    setConnectionStatus((prev) => (prev === "connected" ? "reconnecting" : "connecting"));

    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (isUnmountingRef.current || wsRef.current !== ws) {
        ws.close();
        return;
      }

      membershipStateRef.current = "JOINED";
      setConnectionStatus("connected");

      // Send join_room with stable parameters
      ws.send(
        JSON.stringify({
          type: "join_room",
          roomCode,
          user: userRef.current,
          platform: platformRef.current,
          contentUrl: contentUrlRef.current,
        })
      );

      // Run initial clock sync
      pingClock();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "clock_pong") {
          const now = Date.now();
          const rtt = Math.max(1, now - data.clientTime);
          setLatencyMs(rtt);
          const serverEstimate = data.serverTime + rtt / 2;
          const offset = serverEstimate - now;
          setClockOffset(offset);
          return;
        }

        if (data.type === "room_state") {
          setPeerId(data.yourPeerId);
          setRole(data.role);
          setMembers(data.members || []);
          if (data.messages) {
            setMessages(data.messages);
            data.messages.forEach((m: ChatMessageItem) => {
              if (m.eventId) seenEventIdsRef.current.add(m.eventId);
            });
          }
          if (data.queue) setQueue(data.queue);
          if (data.room) {
            setRoomPlayback({
              isPlaying: data.room.isPlaying,
              currentPosition: data.room.currentPosition,
              serverTime: data.room.serverTime || Date.now(),
            });
            if (data.room.contentUrl) {
              setRoomContent({
                contentUrl: data.room.contentUrl,
                platform: data.room.platform,
                title: data.room.title,
              });
            }
            if (data.room.settings) {
              setRoomSettings(data.room.settings);
            }
          }
          return;
        }

        if (data.type === "content_changed") {
          setRoomContent({
            contentUrl: data.contentUrl,
            platform: data.platform,
            title: data.title,
          });
          setRoomPlayback({
            isPlaying: false,
            currentPosition: 0,
            serverTime: Date.now(),
          });
          callbacksRef.current.onContentChanged?.(data);
          return;
        }

        if (data.type === "queue_update") {
          setQueue(data.queue || []);
          return;
        }

        if (data.type === "settings_update") {
          setRoomSettings((prev: any) => ({ ...prev, ...data.settings }));
          return;
        }

        if (data.type === "kicked") {
          toast.error(data.message || "You were removed from the room");
          callbacksRef.current.onKicked?.(data.message || "You were removed by host");
          return;
        }

        if (data.type === "presence_update") {
          setMembers(data.members || []);
          return;
        }

        if (data.type === "playback_sync") {
          setRoomPlayback({
            isPlaying: data.isPlaying,
            currentPosition: data.position,
            serverTime: data.serverTime || Date.now(),
          });
          callbacksRef.current.onPlaybackSync?.(data);
          return;
        }

        if (data.type === "chat_message") {
          const msg: ChatMessageItem = data.message;
          // System message deduplication check
          if (msg.messageType === "system") {
            const eventKey = msg.eventId || `${msg.content}_${Math.floor(Date.now() / 3000)}`;
            if (seenEventIdsRef.current.has(eventKey)) {
              return;
            }
            seenEventIdsRef.current.add(eventKey);
            if (seenEventIdsRef.current.size > 200) {
              const pruned = Array.from(seenEventIdsRef.current).slice(100);
              seenEventIdsRef.current = new Set(pruned);
            }
          }

          setMessages((prev) => {
            // Avoid duplicate by id
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          return;
        }

        if (data.type === "chat_delete") {
          setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
          return;
        }

        if (data.type === "reaction") {
          setActiveReaction({ emoji: data.emoji, id: Date.now() });
          return;
        }

        if (data.type === "countdown_tick") {
          callbacksRef.current.onCountdownTick?.(data.count, data.message);
          return;
        }

        if (data.type === "voice_signal") {
          callbacksRef.current.onVoiceSignal?.(data.senderPeerId, data.senderName, data.signal);
          return;
        }

        if (data.type === "error") {
          toast.error(data.message || "An error occurred");
          return;
        }
      } catch (err) {
        console.error("[RoomSocket] Parse error:", err);
      }
    };

    ws.onclose = (ev) => {
      if (isUnmountingRef.current) return;
      if (membershipStateRef.current === "LEAVING" || membershipStateRef.current === "LEFT") return;

      setConnectionStatus("reconnecting");

      // Auto-reconnect after grace period interval
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isUnmountingRef.current && membershipStateRef.current !== "LEFT") {
          connect();
        }
      }, 2000);
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
    };
  }, [roomCode, pingClock]);

  // Master lifecycle initialization effect - runs ONLY when roomCode changes
  useEffect(() => {
    isUnmountingRef.current = false;
    membershipStateRef.current = "IDLE";
    connect();

    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    pingIntervalRef.current = setInterval(pingClock, 15000);

    return () => {
      isUnmountingRef.current = true;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.onclose = null;
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
      membershipStateRef.current = "LEFT";
    };
  }, [roomCode, connect, pingClock]);

  // Compute live projected room position and drift classification
  const calculateDrift = useCallback(
    (localPlayerPos: number): { driftSeconds: number; status: DriftStatus; projectedPos: number } => {
      const now = Date.now() + clockOffset;
      const elapsedSinceServer = Math.max(0, (now - roomPlayback.serverTime) / 1000);
      const projected = roomPlayback.isPlaying
        ? roomPlayback.currentPosition + elapsedSinceServer
        : roomPlayback.currentPosition;

      const diff = localPlayerPos - projected;
      const status = classifyDrift(diff);
      setLocalDrift(diff);
      setDriftStatus(status);
      return { driftSeconds: diff, status, projectedPos: projected };
    },
    [roomPlayback, clockOffset]
  );

  // Send Actions to WebSocket Server
  const broadcastPlayback = useCallback((eventType: "play" | "pause" | "seek", position: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "playback_event",
          eventType,
          position,
        })
      );
    }
  }, []);

  const sendChatMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && content.trim()) {
      wsRef.current.send(
        JSON.stringify({
          type: "chat_message",
          content: content.trim(),
        })
      );
    }
  }, []);

  const deleteChatMessage = useCallback((messageId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "delete_message",
          messageId,
        })
      );
    }
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "reaction",
          emoji,
        })
      );
    }
  }, []);

  const triggerCountdown = useCallback((seconds = 3) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "countdown",
          seconds,
        })
      );
    }
  }, []);

  // Voice Chat Signaling
  const joinVoiceChannel = useCallback((isMuted: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "voice_join",
          isMuted,
        })
      );
    }
  }, []);

  const leaveVoiceChannel = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "voice_leave",
        })
      );
    }
  }, []);

  const updateVoiceState = useCallback((isMuted: boolean, isSpeaking: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "voice_state",
          isMuted,
          isSpeaking,
        })
      );
    }
  }, []);

  const sendVoiceSignal = useCallback((targetPeerId: string, signal: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "voice_signal",
          targetPeerId,
          signal,
        })
      );
    }
  }, []);

  const changeContent = useCallback((contentUrl: string, platform?: string, title?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "change_content",
          contentUrl,
          platform,
          title,
        })
      );
    }
  }, []);

  const updateQueue = useCallback((newQueue: QueueItem[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "queue_update",
          queue: newQueue,
        })
      );
    }
  }, []);

  const transferHost = useCallback((targetPeerId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "transfer_host",
          targetPeerId,
        })
      );
    }
  }, []);

  const kickPeer = useCallback((targetPeerId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "kick_peer",
          targetPeerId,
        })
      );
    }
  }, []);

  const updateSettings = useCallback((newSettings: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "update_room_settings",
          settings: newSettings,
        })
      );
    }
  }, []);

  // Authoritative intentional room exit
  const leaveRoom = useCallback(() => {
    membershipStateRef.current = "LEAVING";
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "leave_room" }));
      } catch {}
      try {
        wsRef.current.close(1000, "User left party");
      } catch {}
    }
    membershipStateRef.current = "LEFT";
    setConnectionStatus("disconnected");
  }, []);

  return {
    connected: connectionStatus === "connected",
    connectionStatus,
    peerId,
    role,
    members,
    messages,
    activeReaction,
    roomPlayback,
    clockOffset,
    latencyMs,
    localDrift,
    driftStatus,
    queue,
    roomContent,
    roomSettings,
    calculateDrift,
    broadcastPlayback,
    sendChatMessage,
    deleteChatMessage,
    sendReaction,
    triggerCountdown,
    joinVoiceChannel,
    leaveVoiceChannel,
    updateVoiceState,
    sendVoiceSignal,
    changeContent,
    updateQueue,
    transferHost,
    kickPeer,
    updateSettings,
    leaveRoom,
  };
}
