import { useEffect, useRef, useState, useCallback } from "react";
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
  watchingPosition: number;
}

export interface ChatMessageItem {
  id: number;
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
  const [connected, setConnected] = useState(false);
  const [peerId, setPeerId] = useState<string>("");
  const [role, setRole] = useState<"host" | "moderator" | "participant">("participant");
  const [members, setMembers] = useState<RoomMemberPresence[]>([]);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [activeReaction, setActiveReaction] = useState<{ emoji: string; id: number } | null>(null);
  const [clockOffset, setClockOffset] = useState<number>(0); // Server - Client ms offset
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

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef(false);

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

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socketUrl = `${protocol}//${host}/api/ws`;

    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Join Room
      ws.send(
        JSON.stringify({
          type: "join_room",
          roomCode,
          user,
          platform,
          contentUrl,
        })
      );
      // Immediately run clock sync
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
          if (data.messages) setMessages(data.messages);
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
          onContentChanged?.(data);
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
          onKicked?.(data.message || "You were removed by host");
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
          onPlaybackSync?.(data);
          return;
        }

        if (data.type === "chat_message") {
          setMessages((prev) => [...prev, data.message]);
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
          onCountdownTick?.(data.count, data.message);
          return;
        }

        if (data.type === "voice_signal") {
          onVoiceSignal?.(data.senderPeerId, data.senderName, data.signal);
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

    ws.onclose = () => {
      setConnected(false);
      if (!isUnmountingRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2500);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [roomCode, user, platform, contentUrl, pingClock, onPlaybackSync, onVoiceSignal, onCountdownTick]);

  useEffect(() => {
    isUnmountingRef.current = false;
    connect();

    const clockInterval = setInterval(pingClock, 15000);

    return () => {
      isUnmountingRef.current = true;
      clearInterval(clockInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect, pingClock]);

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

  return {
    connected,
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
    updateVoiceState,
    sendVoiceSignal,
    changeContent,
    updateQueue,
    transferHost,
    kickPeer,
    updateSettings,
  };
}
