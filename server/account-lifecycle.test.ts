import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createServer, Server as HttpServer } from "http";
import WebSocket from "ws";
import { initWebSocketServer } from "./socket";
import * as db from "./db";
import { appRouter } from "./routers";
import { getSystemDiagnostics } from "./_core/envValidator";

describe("PlayOra Account System & Party Lifecycle Architecture", () => {
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

  it("registers and retrieves persistent user accounts via Google profile", async () => {
    const googleUser = await db.upsertUser({
      openId: "google_1029384756",
      googleId: "1029384756",
      name: "Alex Streamer",
      email: "alex@example.com",
      avatarUrl: "https://lh3.googleusercontent.com/a/test-avatar",
      avatarColor: "#4285F4",
      loginMethod: "google",
      role: "user",
    });

    expect(googleUser.id).toBeDefined();
    expect(googleUser.email).toBe("alex@example.com");
    expect(googleUser.googleId).toBe("1029384756");
    expect(googleUser.avatarUrl).toBe("https://lh3.googleusercontent.com/a/test-avatar");

    // Look up user by Google ID and Email
    const byGoogleId = await db.getUserByGoogleId("1029384756");
    expect(byGoogleId?.id).toBe(googleUser.id);

    const byEmail = await db.getUserByEmail("alex@example.com");
    expect(byEmail?.id).toBe(googleUser.id);

    // Update profile
    const updated = await db.updateUserProfile(googleUser.id, {
      name: "Alex Rivers",
      avatarColor: "#D6FF3F",
    });
    expect(updated?.name).toBe("Alex Rivers");
    expect(updated?.avatarColor).toBe("#D6FF3F");
  });

  it("manages watch party lifecycle (Active -> Ended) with persistence and history", async () => {
    const host = await db.upsertUser({
      openId: "host_user_1",
      name: "Party Host",
      loginMethod: "guest",
    });

    // Create room
    const room = await db.createRoom({
      code: "LIFE01",
      title: "Movie Night Interstellar",
      platform: "youtube",
      contentUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
      hostId: host.id,
      status: "active",
      startedAt: new Date(),
    });

    expect(room.status).toBe("active");
    expect(room.startedAt).toBeDefined();
    expect(room.endedAt).toBeNull();

    // Verify room is in active rooms list
    const activeRooms = await db.listActiveRooms();
    expect(activeRooms.some((r) => r.code === "LIFE01")).toBe(true);

    // End room
    const ended = await db.endRoom(room.id);
    expect(ended?.status).toBe("ended");
    expect(ended?.endedAt).toBeInstanceOf(Date);
    expect(ended?.isPlaying).toBe(false);

    // Verify room is no longer in active rooms list
    const activeRoomsAfter = await db.listActiveRooms();
    expect(activeRoomsAfter.some((r) => r.code === "LIFE01")).toBe(false);

    // Verify room is in history
    const history = await db.listHistoryRooms(host.id);
    expect(history.some((r) => r.code === "LIFE01")).toBe(true);

    // Verify user stats
    const stats = await db.getUserStats(host.id);
    expect(stats.hostedCount).toBeGreaterThanOrEqual(1);
    expect(stats.historyRooms.some((r) => r.code === "LIFE01")).toBe(true);
  });

  it("broadcasts party_ended to connected sockets when host ends the party", async () => {
    const hostUser = await db.upsertUser({
      openId: "socket_host_1",
      name: "Socket Host",
      loginMethod: "guest",
    });

    const participantUser = await db.upsertUser({
      openId: "socket_part_1",
      name: "Socket Participant",
      loginMethod: "guest",
    });

    const room = await db.createRoom({
      code: "ENDTEST1",
      title: "Testing End Broadcast",
      platform: "youtube",
      contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      hostId: hostUser.id,
      status: "active",
    });

    const hostWs = await createSocket();
    const participantWs = await createSocket();

    // Participant joins
    const partStatePromise = waitForMessage(participantWs, (m) => m.type === "room_state");
    participantWs.send(
      JSON.stringify({
        type: "join_room",
        roomCode: "ENDTEST1",
        user: { id: participantUser.id, name: participantUser.name },
      })
    );
    await partStatePromise;

    // Host joins
    const hostStatePromise = waitForMessage(hostWs, (m) => m.type === "room_state");
    hostWs.send(
      JSON.stringify({
        type: "join_room",
        roomCode: "ENDTEST1",
        user: { id: hostUser.id, name: hostUser.name },
      })
    );
    await hostStatePromise;

    // Participant prepares to listen for party_ended
    const endedPromise = waitForMessage(participantWs, (m) => m.type === "party_ended");

    // Host sends end_party
    hostWs.send(JSON.stringify({ type: "end_party" }));

    const endedMsg = await endedPromise;
    expect(endedMsg.type).toBe("party_ended");
    expect(endedMsg.message).toContain("Watch party ended");

    // Re-joining ended room should immediately reject with party_ended
    const newWs = await createSocket();
    const immediateEndedPromise = waitForMessage(newWs, (m) => m.type === "party_ended");
    newWs.send(
      JSON.stringify({
        type: "join_room",
        roomCode: "ENDTEST1",
        user: { id: 999, name: "Late Joiner" },
      })
    );
    const rejectedMsg = await immediateEndedPromise;
    expect(rejectedMsg.type).toBe("party_ended");

    hostWs.close();
    participantWs.close();
    newWs.close();
  });

  it("identifies userJoinedBefore for active rooms to power the Rejoin feature", async () => {
    const testUser = await db.upsertUser({
      openId: "rejoin_user_1",
      name: "Rejoin Member",
    });

    const strangerUser = await db.upsertUser({
      openId: "stranger_user_1",
      name: "Stranger Member",
    });

    const activeRoom = await db.createRoom({
      code: "REJOIN01",
      title: "Rejoin Test Party",
      platform: "youtube",
      contentUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      hostId: 99999,
      status: "active",
      isPlaying: true,
      currentPosition: 120,
    });

    // Record testUser as member of activeRoom
    await db.recordMemberJoin(activeRoom.id, testUser.id, "participant");

    // Query active rooms for testUser
    const testUserRooms = await db.listActiveRooms(testUser.id);
    const targetRoomForTestUser = testUserRooms.find((r) => r.code === "REJOIN01");
    expect(targetRoomForTestUser).toBeDefined();
    expect(targetRoomForTestUser?.userJoinedBefore).toBe(true);

    // Query active rooms for strangerUser
    const strangerRooms = await db.listActiveRooms(strangerUser.id);
    const targetRoomForStranger = strangerRooms.find((r) => r.code === "REJOIN01");
    expect(targetRoomForStranger).toBeDefined();
    expect(targetRoomForStranger?.userJoinedBefore).toBe(false);

    // Query active rooms with no user (guest)
    const guestRooms = await db.listActiveRooms(undefined);
    const targetRoomForGuest = guestRooms.find((r) => r.code === "REJOIN01");
    expect(targetRoomForGuest).toBeDefined();
    expect(targetRoomForGuest?.userJoinedBefore).toBe(false);
  });

  it("provides comprehensive Google Identity Services diagnostics", async () => {
    const diag = await getSystemDiagnostics();
    expect(diag.googleAuth).toBeDefined();
    expect(typeof diag.googleAuth.clientConfigured).toBe("boolean");
    expect(typeof diag.googleAuth.secretConfigured).toBe("boolean");
    expect(diag.googleAuth.tokenVerificationReady).toBe(true);
    expect(typeof diag.googleAuth.sessionCreatedReady).toBe("boolean");
  });
});
