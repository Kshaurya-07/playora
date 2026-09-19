import type { Server as HttpServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import * as db from "./db";

export interface ClientSession {
  ws: WebSocket;
  peerId: string;
  roomCode?: string;
  userId: number;
  userName: string;
  avatarColor: string;
  role: "host" | "moderator" | "participant";
  isMuted: boolean;
  isSpeaking: boolean;
  currentPosition: number;
  lastPing: number;
}

export interface RoomPresenceMember {
  peerId: string;
  userId: number;
  name: string;
  avatarColor: string;
  role: "host" | "moderator" | "participant";
  isMuted: boolean;
  isSpeaking: boolean;
  watchingPosition: number;
}

export function initWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });
  const clients = new Map<WebSocket, ClientSession>();
  const rooms = new Map<string, Set<WebSocket>>();
  const roomQueues = new Map<string, any[]>();

  const broadcastToRoom = (
    roomCode: string,
    message: object,
    excludeWs?: WebSocket
  ) => {
    const sockets = rooms.get(roomCode.toUpperCase());
    if (!sockets) return;
    const payload = JSON.stringify(message);
    for (const socket of sockets) {
      if (socket !== excludeWs && socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  };

  const getRoomMembers = (roomCode: string): RoomPresenceMember[] => {
    const sockets = rooms.get(roomCode.toUpperCase());
    if (!sockets) return [];
    const members: RoomPresenceMember[] = [];
    for (const ws of sockets) {
      const session = clients.get(ws);
      if (session) {
        members.push({
          peerId: session.peerId,
          userId: session.userId,
          name: session.userName,
          avatarColor: session.avatarColor,
          role: session.role,
          isMuted: session.isMuted,
          isSpeaking: session.isSpeaking,
          watchingPosition: session.currentPosition,
        });
      }
    }
    return members;
  };

  const leaveCurrentRoom = (ws: WebSocket) => {
    const session = clients.get(ws);
    if (!session || !session.roomCode) return;

    const roomCode = session.roomCode.toUpperCase();
    const roomSet = rooms.get(roomCode);
    if (roomSet) {
      roomSet.delete(ws);
      if (roomSet.size === 0) {
        rooms.delete(roomCode);
      }
    }

    broadcastToRoom(roomCode, {
      type: "presence_update",
      members: getRoomMembers(roomCode),
    });

    broadcastToRoom(roomCode, {
      type: "chat_message",
      message: {
        id: Date.now(),
        senderName: "PlayOra",
        senderColor: "#D6FF3F",
        content: `${session.userName} left the party`,
        messageType: "system",
        createdAt: new Date().toISOString(),
      },
    });

    session.roomCode = undefined;
  };

  wss.on("connection", (ws: WebSocket) => {
    const peerId = "peer_" + Math.random().toString(36).substring(2, 10);
    const session: ClientSession = {
      ws,
      peerId,
      userId: 0,
      userName: "Guest",
      avatarColor: "#8EABE9",
      role: "participant",
      isMuted: false,
      isSpeaking: false,
      currentPosition: 0,
      lastPing: Date.now(),
    };
    clients.set(ws, session);

    ws.on("message", async (raw: string | Buffer) => {
      try {
        const data = JSON.parse(raw.toString());
        const type = data.type;

        if (type === "clock_ping") {
          ws.send(
            JSON.stringify({
              type: "clock_pong",
              clientTime: data.clientTime,
              serverTime: Date.now(),
            })
          );
          return;
        }

        if (type === "join_room") {
          leaveCurrentRoom(ws);

          const roomCode = String(data.roomCode || "").toUpperCase().trim();
          const user = data.user || {};

          session.roomCode = roomCode;
          session.userId = Number(user.id) || Date.now();
          session.userName = String(user.name || "Guest").trim();
          session.avatarColor = String(user.avatarColor || "#8EABE9");

          let room = await db.getRoomByCode(roomCode);
          if (!room) {
            // Auto-provision room if not found in db so party links work smoothly
            room = await db.createRoom({
              code: roomCode,
              title: "Watch Party " + roomCode,
              platform: data.platform || "youtube",
              contentUrl: data.contentUrl || "https://www.youtube.com/watch?v=M7lc1UVf-VE",
              hostId: session.userId,
              isPlaying: false,
              currentPosition: 0,
              settings: {
                hostOnlyControls: true,
                lockSeeking: false,
                allowReactions: true,
                allowVoice: true,
                isPublic: true,
              },
            });
          }

          session.role = room.hostId === session.userId ? "host" : "participant";

          if (!rooms.has(roomCode)) {
            rooms.set(roomCode, new Set());
          }
          rooms.get(roomCode)!.add(ws);

          // Calculate projected playback position
          const now = Date.now();
          const elapsed = (now - new Date(room.positionUpdatedAt).getTime()) / 1000;
          const projectedPosition = room.isPlaying
            ? room.currentPosition + Math.max(0, elapsed)
            : room.currentPosition;

          // Send current state to newly joined client
          ws.send(
            JSON.stringify({
              type: "room_state",
              room: {
                ...room,
                currentPosition: projectedPosition,
                serverTime: now,
              },
              yourPeerId: session.peerId,
              role: session.role,
              members: getRoomMembers(roomCode),
              messages: await db.getRoomMessages(room.id),
              queue: roomQueues.get(roomCode) || [],
            })
          );

          // Broadcast presence update to everyone in the room
          broadcastToRoom(roomCode, {
            type: "presence_update",
            members: getRoomMembers(roomCode),
          });

          // Broadcast system join notification
          broadcastToRoom(roomCode, {
            type: "chat_message",
            message: {
              id: Date.now(),
              senderName: "PlayOra",
              senderColor: "#D6FF3F",
              content: `${session.userName} entered the room`,
              messageType: "system",
              createdAt: new Date().toISOString(),
            },
          });
          return;
        }

        if (!session.roomCode) return;
        const roomCode = session.roomCode;
        const room = await db.getRoomByCode(roomCode);
        if (!room) return;

        if (type === "playback_event") {
          const { eventType, position } = data;
          const isHost = session.role === "host";

          // If host-only controls are enabled, verify permission
          if (room.settings?.hostOnlyControls && !isHost) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Playback is controlled by the host only.",
              })
            );
            return;
          }

          let isPlaying = room.isPlaying;
          if (eventType === "play") isPlaying = true;
          if (eventType === "pause") isPlaying = false;

          const safePosition = Math.max(0, Number(position) || 0);
          await db.updateRoomPlayback(room.id, isPlaying, safePosition);
          await db.recordPlaybackEvent({
            roomId: room.id,
            userId: session.userId,
            eventType,
            position: safePosition,
          });

          const serverTime = Date.now();
          broadcastToRoom(roomCode, {
            type: "playback_sync",
            eventType,
            position: safePosition,
            isPlaying,
            serverTime,
            initiatedBy: session.userName,
          });
          return;
        }

        if (type === "chat_message") {
          const content = String(data.content || "").trim();
          if (!content) return;

          const savedMessage = await db.addMessage({
            roomId: room.id,
            userId: session.userId,
            senderName: session.userName,
            senderColor: session.avatarColor,
            content,
            messageType: data.messageType || "chat",
          });

          broadcastToRoom(roomCode, {
            type: "chat_message",
            message: {
              ...savedMessage,
              createdAt: savedMessage.createdAt.toISOString(),
            },
          });
          return;
        }

        if (type === "delete_message") {
          const messageId = Number(data.messageId);
          const isHost = session.role === "host";
          const success = await db.deleteMessage(messageId, session.userId, isHost);
          if (success) {
            broadcastToRoom(roomCode, {
              type: "chat_delete",
              messageId,
            });
          }
          return;
        }

        if (type === "reaction") {
          if (!room.settings?.allowReactions) return;
          const emoji = String(data.emoji || "🔥");
          broadcastToRoom(roomCode, {
            type: "reaction",
            emoji,
            senderName: session.userName,
            senderPeerId: session.peerId,
          });
          return;
        }

        if (type === "voice_state") {
          session.isMuted = Boolean(data.isMuted);
          session.isSpeaking = Boolean(data.isSpeaking);
          broadcastToRoom(roomCode, {
            type: "presence_update",
            members: getRoomMembers(roomCode),
          });
          return;
        }

        if (type === "voice_signal") {
          // Relay WebRTC signaling between peers
          const { targetPeerId, signal } = data;
          const sockets = rooms.get(roomCode.toUpperCase());
          if (sockets) {
            for (const socket of sockets) {
              const targetSession = clients.get(socket);
              if (targetSession && targetSession.peerId === targetPeerId) {
                socket.send(
                  JSON.stringify({
                    type: "voice_signal",
                    senderPeerId: session.peerId,
                    senderName: session.userName,
                    signal,
                  })
                );
                break;
              }
            }
          }
          return;
        }

        if (type === "countdown") {
          // 3-2-1 Synchronized countdown for Assisted Sync mode
          const isHost = session.role === "host";
          if (room.settings?.hostOnlyControls && !isHost) return;

          const duration = Math.max(1, Math.min(10, Number(data.seconds) || 3));
          let count = duration;

          const interval = setInterval(() => {
            broadcastToRoom(roomCode, {
              type: "countdown_tick",
              count,
              message: count > 0 ? `Starting in ${count}...` : "PLAY NOW!",
            });

            if (count <= 0) {
              clearInterval(interval);
              db.updateRoomPlayback(room.id, true, room.currentPosition);
              broadcastToRoom(roomCode, {
                type: "playback_sync",
                eventType: "play",
                position: room.currentPosition,
                isPlaying: true,
                serverTime: Date.now(),
                initiatedBy: session.userName,
              });
            }
            count--;
          }, 1000);
          return;
        }

        if (type === "change_content") {
          const isHost = session.role === "host";
          if (room.settings?.hostOnlyControls && !isHost) {
            ws.send(JSON.stringify({ type: "error", message: "Only the host can change content." }));
            return;
          }
          const contentUrl = String(data.contentUrl || "").trim();
          const platform = String(data.platform || "generic");
          const title = String(data.title || room.title);
          if (!contentUrl) return;

          await db.updateRoomContent(room.id, contentUrl, platform, title);
          broadcastToRoom(roomCode, {
            type: "content_changed",
            contentUrl,
            platform,
            title,
            currentPosition: 0,
            isPlaying: false,
            initiatedBy: session.userName,
          });
          broadcastToRoom(roomCode, {
            type: "chat_message",
            message: {
              id: Date.now(),
              senderName: "PlayOra",
              senderColor: "#D6FF3F",
              content: `${session.userName} changed stream to ${title}`,
              messageType: "system",
              createdAt: new Date().toISOString(),
            },
          });
          return;
        }

        if (type === "queue_update") {
          const queue = Array.isArray(data.queue) ? data.queue : [];
          roomQueues.set(roomCode.toUpperCase(), queue);
          broadcastToRoom(roomCode, {
            type: "queue_update",
            queue,
          });
          return;
        }

        if (type === "transfer_host") {
          if (session.role !== "host") return;
          const targetPeerId = String(data.targetPeerId || "");
          const sockets = rooms.get(roomCode.toUpperCase());
          if (sockets) {
            for (const s of sockets) {
              const targetSession = clients.get(s);
              if (targetSession && targetSession.peerId === targetPeerId) {
                targetSession.role = "host";
                session.role = "participant";
                await db.updateRoomHost(room.id, targetSession.userId);
                broadcastToRoom(roomCode, {
                  type: "presence_update",
                  members: getRoomMembers(roomCode),
                });
                broadcastToRoom(roomCode, {
                  type: "chat_message",
                  message: {
                    id: Date.now(),
                    senderName: "PlayOra",
                    senderColor: "#D6FF3F",
                    content: `${targetSession.userName} is now the party host`,
                    messageType: "system",
                    createdAt: new Date().toISOString(),
                  },
                });
                break;
              }
            }
          }
          return;
        }

        if (type === "kick_peer") {
          if (session.role !== "host") return;
          const targetPeerId = String(data.targetPeerId || "");
          const sockets = rooms.get(roomCode.toUpperCase());
          if (sockets) {
            for (const s of sockets) {
              const targetSession = clients.get(s);
              if (targetSession && targetSession.peerId === targetPeerId) {
                s.send(
                  JSON.stringify({
                    type: "kicked",
                    message: "You were removed from the watch party by the host.",
                  })
                );
                leaveCurrentRoom(s);
                s.close();
                break;
              }
            }
          }
          return;
        }

        if (type === "update_room_settings") {
          if (session.role !== "host") return;
          const newSettings = data.settings || {};
          await db.updateRoomSettings(room.id, newSettings);
          broadcastToRoom(roomCode, {
            type: "settings_update",
            settings: newSettings,
          });
          return;
        }
      } catch (err) {
        console.error("[WebSocket] Error handling message:", err);
      }
    });

    ws.on("close", () => {
      leaveCurrentRoom(ws);
      clients.delete(ws);
    });

    ws.on("error", () => {
      leaveCurrentRoom(ws);
      clients.delete(ws);
    });
  });

  // Heartbeat to keep connections healthy
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  console.log("[WebSocket] Real-time engine mounted on /api/ws");
  return wss;
}
