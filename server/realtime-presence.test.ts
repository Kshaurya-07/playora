import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createServer, Server as HttpServer } from "http";
import WebSocket from "ws";
import { initWebSocketServer } from "./socket";
import * as db from "./db";

describe("PlayOra Real-Time Presence & Lifecycle Architecture", () => {
  let server: HttpServer;
  let port: number;
  let wsUrl: string;

  beforeAll(async () => {
    server = createServer();
    initWebSocketServer(server);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === "object" && addr) {
          port = addr.port;
          wsUrl = `ws://127.0.0.1:${port}/api/ws`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  const createSocket = () => {
    return new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.on("open", () => resolve(ws));
      ws.on("error", reject);
    });
  };

  const waitForMessage = (ws: WebSocket, predicate: (msg: any) => boolean, timeoutMs = 3000): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.off("message", onMsg);
        reject(new Error("Timeout waiting for message"));
      }, timeoutMs);

      const onMsg = (raw: Buffer) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (predicate(parsed)) {
            clearTimeout(timer);
            ws.off("message", onMsg);
            resolve(parsed);
          }
        } catch {}
      };

      ws.on("message", onMsg);
    });
  };

  it("deduplicates multiple join_room calls from the same user (no duplicate system messages)", async () => {
    const ws = await createSocket();
    const roomCode = "DEDUPTEST_" + Date.now();
    const user = { id: 101, name: "Alice", avatarColor: "#D6FF3F" };

    const systemMessages: string[] = [];
    ws.on("message", (raw: Buffer) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === "chat_message" && data.message?.messageType === "system") {
          systemMessages.push(data.message.content);
        }
      } catch {}
    });

    // Send first join_room
    ws.send(JSON.stringify({ type: "join_room", roomCode, user }));
    await waitForMessage(ws, (m) => m.type === "room_state");

    // Send second and third join_room (simulating React StrictMode or re-renders)
    ws.send(JSON.stringify({ type: "join_room", roomCode, user }));
    ws.send(JSON.stringify({ type: "join_room", roomCode, user }));

    // Wait a brief tick
    await new Promise((r) => setTimeout(r, 200));

    // Exactly 1 join system message must have been emitted, NOT 3
    const enterMessages = systemMessages.filter((m) => m.includes("entered the room"));
    expect(enterMessages.length).toBe(1);
    expect(enterMessages[0]).toBe("Alice entered the room");

    // Zero leave messages
    const leaveMessages = systemMessages.filter((m) => m.includes("left the party"));
    expect(leaveMessages.length).toBe(0);

    ws.close();
  });

  it("handles multi-tab connections without duplicating participant count", async () => {
    const roomCode = "TABTEST_" + Date.now();
    const user = { id: 202, name: "Bob", avatarColor: "#8EABE9" };

    const tab1 = await createSocket();
    tab1.send(JSON.stringify({ type: "join_room", roomCode, user }));
    const state1 = await waitForMessage(tab1, (m) => m.type === "room_state");
    expect(state1.members.length).toBe(1);

    // Tab 2 opens the same room with same user
    const tab2 = await createSocket();
    tab2.send(JSON.stringify({ type: "join_room", roomCode, user }));
    const state2 = await waitForMessage(tab2, (m) => m.type === "room_state");

    // Participant count MUST still be 1 (Bob only appears once in People list!)
    expect(state2.members.length).toBe(1);
    expect(state2.members[0].name).toBe("Bob");

    // Close Tab 1 - Bob still has Tab 2 open, so Bob remains connected with no disconnect
    tab1.close();
    await new Promise((r) => setTimeout(r, 150));

    tab2.close();
  });

  it("supports voice chat join/leave/mute without affecting room connection", async () => {
    const roomCode = "VOICETEST_" + Date.now();
    const user = { id: 303, name: "Charlie", avatarColor: "#FF5E7E" };

    const ws = await createSocket();
    ws.send(JSON.stringify({ type: "join_room", roomCode, user }));
    await waitForMessage(ws, (m) => m.type === "room_state");

    // Join voice
    ws.send(JSON.stringify({ type: "voice_join", isMuted: false }));
    const presence1 = await waitForMessage(
      ws,
      (m) => m.type === "presence_update" && m.members[0].isVoiceActive === true
    );
    expect(presence1.members[0].isVoiceActive).toBe(true);
    expect(presence1.members[0].isMuted).toBe(false);

    // Toggle mute in voice
    ws.send(JSON.stringify({ type: "voice_state", isMuted: true, isSpeaking: false }));
    const presence2 = await waitForMessage(
      ws,
      (m) => m.type === "presence_update" && m.members[0].isMuted === true
    );
    expect(presence2.members[0].isMuted).toBe(true);

    // Leave voice
    ws.send(JSON.stringify({ type: "voice_leave" }));
    const presence3 = await waitForMessage(
      ws,
      (m) => m.type === "presence_update" && m.members[0].isVoiceActive === false
    );
    expect(presence3.members[0].isVoiceActive).toBe(false);
    // User is STILL in room!
    expect(presence3.members.length).toBe(1);

    ws.close();
  });

  it("handles explicit leave_room immediately", async () => {
    const roomCode = "LEAVETEST_" + Date.now();
    const host = { id: 401, name: "Host", avatarColor: "#D6FF3F" };
    const friend = { id: 402, name: "Friend", avatarColor: "#8EABE9" };

    const hostWs = await createSocket();
    hostWs.send(JSON.stringify({ type: "join_room", roomCode, user: host }));
    await waitForMessage(hostWs, (m) => m.type === "room_state");

    const friendWs = await createSocket();
    friendWs.send(JSON.stringify({ type: "join_room", roomCode, user: friend }));
    await waitForMessage(friendWs, (m) => m.type === "room_state");

    // Friend explicitly leaves
    friendWs.send(JSON.stringify({ type: "leave_room" }));

    // Host should receive "Friend left the party"
    const leaveMsg = await waitForMessage(
      hostWs,
      (m) => m.type === "chat_message" && m.message?.content?.includes("left the party")
    );
    expect(leaveMsg.message.content).toBe("Friend left the party");
    expect(leaveMsg.message.eventId).toBeDefined();

    hostWs.close();
    friendWs.close();
  });
});
