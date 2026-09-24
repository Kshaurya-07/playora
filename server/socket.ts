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
  isVoiceActive: boolean;
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
  isVoiceActive: boolean;
  connectionStatus: "connected" | "reconnecting";
  watchingPosition: number;
}

interface RoomUserRecord {
  userId: number;
  userName: string;
  avatarColor: string;
  role: "host" | "moderator" | "participant";
  peerId: string;
  sockets: Set<WebSocket>;
  isMuted: boolean;
  isSpeaking: boolean;
  isVoiceActive: boolean;
  currentPosition: number;
  connectionStatus: "connected" | "reconnecting";
  disconnectTimeout?: NodeJS.Timeout;
}

const DISCONNECT_GRACE_PERIOD_MS = 15000; // 15 seconds grace period for temporary drops/refreshes

export function initWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });
  const clients = new Map<WebSocket, ClientSession>();
  const roomSockets = new Map<string, Set<WebSocket>>();
  const roomMembers = new Map<string, Map<number, RoomUserRecord>>();
  const roomQueues = new Map<string, any[]>();

  const broadcastToRoom = (
    roomCode: string,
    message: object,
    excludeWs?: WebSocket
  ) => {
    const sockets = roomSockets.get(roomCode.toUpperCase());
    if (!sockets) return;
    const payload = JSON.stringify(message);
    for (const socket of sockets) {
      if (socket !== excludeWs && socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  };

  const getRoomMembers = (roomCode: string): RoomPresenceMember[] => {
    const users = roomMembers.get(roomCode.toUpperCase());
    if (!users) return [];
    const members: RoomPresenceMember[] = [];
    for (const record of users.values()) {
      members.push({
        peerId: record.peerId,
        userId: record.userId,
        name: record.userName,
        avatarColor: record.avatarColor,
        role: record.role,
        isMuted: record.isMuted,
        isSpeaking: record.isSpeaking,
        isVoiceActive: record.isVoiceActive,
        connectionStatus: record.connectionStatus,
        watchingPosition: record.currentPosition,
      });
    }
    return members;
  };

  const handleSocketDisconnect = (ws: WebSocket, isExplicitLeave = false) => {
    const session = clients.get(ws);
    if (!session || !session.roomCode) {
      clients.delete(ws);
      return;
    }

    const roomCode = session.roomCode.toUpperCase();
    const userId = session.userId;

    const sockets = roomSockets.get(roomCode);
    if (sockets) {
      sockets.delete(ws);
    }

    const users = roomMembers.get(roomCode);
    if (!users) {
      clients.delete(ws);
      return;
    }

    const userRecord = users.get(userId);
    if (!userRecord) {
      clients.delete(ws);
      return;
    }

    userRecord.sockets.delete(ws);
    clients.delete(ws);

    if (isExplicitLeave) {
      // User explicitly clicked "Leave Party"
      if (userRecord.disconnectTimeout) {
        clearTimeout(userRecord.disconnectTimeout);
        userRecord.disconnectTimeout = undefined;
      }
      users.delete(userId);
      if (users.size === 0) {
        roomMembers.delete(roomCode);
        roomSockets.delete(roomCode);
      }

      broadcastToRoom(roomCode, {
        type: "presence_update",
        members: getRoomMembers(roomCode),
      });

      const eventId = `leave_${roomCode}_${userId}_${Date.now()}`;
      broadcastToRoom(roomCode, {
        type: "chat_message",
        message: {
          eventId,
          id: Date.now(),
          senderName: "PlayOra",
          senderColor: "#D6FF3F",
          content: `${userRecord.userName} left the party`,
          messageType: "system",
          createdAt: new Date().toISOString(),
        },
      });
      return;
    }

    // Check if the user still has another active tab/socket
    if (userRecord.sockets.size > 0) {
      return;
    }

    // No active sockets: initiate disconnect grace period
    userRecord.connectionStatus = "reconnecting";
    broadcastToRoom(roomCode, {
      type: "presence_update",
      members: getRoomMembers(roomCode),
    });

    if (userRecord.disconnectTimeout) {
      clearTimeout(userRecord.disconnectTimeout);
    }

    userRecord.disconnectTimeout = setTimeout(() => {
      // Grace period expired without reconnection!
      const currentUsers = roomMembers.get(roomCode);
      if (currentUsers && currentUsers.get(userId) === userRecord) {
        currentUsers.delete(userId);
        if (currentUsers.size === 0) {
          roomMembers.delete(roomCode);
          roomSockets.delete(roomCode);
        }

        broadcastToRoom(roomCode, {
          type: "presence_update",
          members: getRoomMembers(roomCode),
        });

        const eventId = `leave_${roomCode}_${userId}_${Date.now()}`;
        broadcastToRoom(roomCode, {
          type: "chat_message",
          message: {
            eventId,
            id: Date.now(),
            senderName: "PlayOra",
            senderColor: "#D6FF3F",
            content: `${userRecord.userName} left the party`,
            messageType: "system",
            createdAt: new Date().toISOString(),
          },
        });
      }
    }, DISCONNECT_GRACE_PERIOD_MS);
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
      isVoiceActive: false,
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
          const roomCode = String(data.roomCode || "").toUpperCase().trim();
          const user = data.user || {};
          const userId = Number(user.id) || session.userId || Date.now();
          const userName = String(user.name || "Guest").trim();
          const avatarColor = String(user.avatarColor || "#8EABE9");

          session.roomCode = roomCode;
          session.userId = userId;
          session.userName = userName;
          session.avatarColor = avatarColor;

          let users = roomMembers.get(roomCode);
          if (!users) {
            users = new Map<number, RoomUserRecord>();
            roomMembers.set(roomCode, users);
          }

          let sockets = roomSockets.get(roomCode);
          if (!sockets) {
            sockets = new Set<WebSocket>();
            roomSockets.set(roomCode, sockets);
          }
          sockets.add(ws);

          let room = await db.getRoomByCode(roomCode);
          if (!room) {
            room = await db.createRoom({
              code: roomCode,
              title: "Watch Party " + roomCode,
              platform: data.platform || "youtube",
              contentUrl: data.contentUrl || "https://www.youtube.com/watch?v=M7lc1UVf-VE",
              hostId: userId,
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

          let isFirstJoin = false;
          let userRecord = users.get(userId);

          if (userRecord) {
            // User reconnecting or joining via another tab
            if (userRecord.disconnectTimeout) {
              clearTimeout(userRecord.disconnectTimeout);
              userRecord.disconnectTimeout = undefined;
            }
            userRecord.connectionStatus = "connected";
            userRecord.sockets.add(ws);
            userRecord.peerId = session.peerId;
            userRecord.userName = userName;
            userRecord.avatarColor = avatarColor;
            session.role = userRecord.role;
            session.isVoiceActive = userRecord.isVoiceActive;
            session.isMuted = userRecord.isMuted;
          } else {
            // First time joining the room
            isFirstJoin = true;
            const role: "host" | "participant" = room.hostId === userId ? "host" : "participant";
            session.role = role;

            userRecord = {
              userId,
              userName,
              avatarColor,
              role,
              peerId: session.peerId,
              sockets: new Set([ws]),
              isMuted: false,
              isSpeaking: false,
              isVoiceActive: false,
              currentPosition: 0,
              connectionStatus: "connected",
            };
            users.set(userId, userRecord);
          }

          // Calculate projected playback position
          const now = Date.now();
          const elapsed = (now - new Date(room.positionUpdatedAt).getTime()) / 1000;
          const projectedPosition = room.isPlaying
            ? room.currentPosition + Math.max(0, elapsed)
            : room.currentPosition;

          // Send current state to newly connected client
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

          // Broadcast presence update
          broadcastToRoom(roomCode, {
            type: "presence_update",
            members: getRoomMembers(roomCode),
          });

          // ONLY broadcast system join message if this is the user's first active join
          if (isFirstJoin) {
            const eventId = `join_${roomCode}_${userId}_${Date.now()}`;
            broadcastToRoom(roomCode, {
              type: "chat_message",
              message: {
                eventId,
                id: Date.now(),
                roomId: room.id,
                userId,
                senderName: "PlayOra",
                senderColor: "#D6FF3F",
                content: `${userName} entered the room`,
                messageType: "system",
                createdAt: new Date().toISOString(),
              },
            });
          }
          return;
        }

        if (type === "leave_room") {
          handleSocketDisconnect(ws, true);
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

        // Voice state separation: join, leave, mute/speaking
        if (type === "voice_join") {
          const users = roomMembers.get(roomCode);
          const userRecord = users?.get(session.userId);
          if (userRecord) {
            userRecord.isVoiceActive = true;
            userRecord.isMuted = Boolean(data.isMuted);
            session.isVoiceActive = true;
            session.isMuted = userRecord.isMuted;
            broadcastToRoom(roomCode, {
              type: "presence_update",
              members: getRoomMembers(roomCode),
            });
          }
          return;
        }

        if (type === "voice_leave") {
          const users = roomMembers.get(roomCode);
          const userRecord = users?.get(session.userId);
          if (userRecord) {
            userRecord.isVoiceActive = false;
            userRecord.isSpeaking = false;
            session.isVoiceActive = false;
            session.isSpeaking = false;
            broadcastToRoom(roomCode, {
              type: "presence_update",
              members: getRoomMembers(roomCode),
            });
          }
          return;
        }

        if (type === "voice_state") {
          const users = roomMembers.get(roomCode);
          const userRecord = users?.get(session.userId);
          if (userRecord) {
            userRecord.isMuted = Boolean(data.isMuted);
            userRecord.isSpeaking = Boolean(data.isSpeaking);
            session.isMuted = userRecord.isMuted;
            session.isSpeaking = userRecord.isSpeaking;
            broadcastToRoom(roomCode, {
              type: "presence_update",
              members: getRoomMembers(roomCode),
            });
          }
          return;
        }

        if (type === "voice_signal") {
          // Relay WebRTC signaling between peers
          const { targetPeerId, signal } = data;
          const sockets = roomSockets.get(roomCode);
          if (sockets) {
            for (const socket of sockets) {
              const targetSession = clients.get(socket);
              if (targetSession && targetSession.peerId === targetPeerId && socket.readyState === WebSocket.OPEN) {
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
          const sockets = roomSockets.get(roomCode);
          if (sockets) {
            for (const s of sockets) {
              const targetSession = clients.get(s);
              if (targetSession && targetSession.peerId === targetPeerId) {
                targetSession.role = "host";
                session.role = "participant";
                const users = roomMembers.get(roomCode);
                if (users) {
                  const targetUser = users.get(targetSession.userId);
                  if (targetUser) targetUser.role = "host";
                  const hostUser = users.get(session.userId);
                  if (hostUser) hostUser.role = "participant";
                }
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
          const sockets = roomSockets.get(roomCode);
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
                handleSocketDisconnect(s, true);
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
      handleSocketDisconnect(ws, false);
    });

    ws.on("error", () => {
      handleSocketDisconnect(ws, false);
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
