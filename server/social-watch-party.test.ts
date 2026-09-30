import { describe, it, expect, beforeEach } from "vitest";
import * as db from "./db";
import {
  computeForceSyncCorrection,
  resolveStreamingContent,
  formatTimecode,
} from "../shared/universal-streaming-engine";

describe("PlayOra 2.0 — Social Watch Party & Real-Time Sync Engine", () => {
  beforeEach(() => {
    db.resetMemoryStore();
  });

  describe("1. Room Code & Password Hashing Security", () => {
    it("generates canonical room codes matching PO-XXXXXX format", () => {
      const code1 = db.generateRoomCode();
      const code2 = db.generateRoomCode();

      expect(code1).toMatch(/^PO-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
      expect(code2).toMatch(/^PO-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
      expect(code1).not.toBe(code2);
    });

    it("securely hashes and verifies room passwords with salted SHA-256", () => {
      const plainPassword = "SuperSecretParty2026!";
      const hash = db.hashRoomPassword(plainPassword);

      // Never stores or outputs raw password
      expect(hash).not.toContain(plainPassword);
      expect(hash.length).toBe(64); // SHA-256 hex string

      // Verification logic
      expect(db.verifyRoomPassword(plainPassword, hash)).toBe(true);
      expect(db.verifyRoomPassword("WrongPassword", hash)).toBe(false);
      expect(db.verifyRoomPassword("", hash)).toBe(false);

      // Unprotected rooms
      expect(db.verifyRoomPassword("anything", null)).toBe(true);
    });

    it("generates sanitized, collision-safe PlayOra IDs", () => {
      const id1 = db.generatePlayoraId("Alex Mercer");
      const id2 = db.generatePlayoraId("Kshaurya!#@$");

      expect(id1).toMatch(/^@alexmercer\d{4}$/);
      expect(id2).toMatch(/^@kshaurya\d{4}$/);
    });
  });

  describe("2. Real Friend System & Social Request Lifecycle", () => {
    it("manages the complete friend request lifecycle (send -> accept -> list)", async () => {
      const userA = db.memoryStore.upsertUser({
        openId: "user_a_openid",
        name: "User Alpha",
        username: "useralpha",
        playoraId: "@useralpha",
        avatarColor: "#D6FF3F",
      });

      const userB = db.memoryStore.upsertUser({
        openId: "user_b_openid",
        name: "User Beta",
        username: "userbeta",
        playoraId: "@userbeta",
        avatarColor: "#8EABE9",
      });

      // Send friend request
      const req = await db.sendFriendRequest(userA.id, userB.id);
      expect(req.status).toBe("pending");

      // Verify incoming / outgoing request lists
      const pendingB = await db.listPendingFriendRequestsDetailed(userB.id);
      expect(pendingB.incoming.length).toBe(1);
      expect(pendingB.incoming[0].senderName).toBe("User Alpha");
      expect(pendingB.outgoing.length).toBe(0);

      const pendingA = await db.listPendingFriendRequestsDetailed(userA.id);
      expect(pendingA.outgoing.length).toBe(1);
      expect(pendingA.outgoing[0].receiverName).toBe("User Beta");
      expect(pendingA.incoming.length).toBe(0);

      // Accept request
      const accepted = await db.respondFriendRequest(req.id, userB.id, "accept");
      expect(accepted?.status).toBe("accepted");

      // Both users should now see each other in their friend list
      const friendsOfA = await db.listFriends(userA.id);
      expect(friendsOfA.length).toBe(1);
      expect(friendsOfA[0].id).toBe(userB.id);

      const friendsOfB = await db.listFriends(userB.id);
      expect(friendsOfB.length).toBe(1);
      expect(friendsOfB[0].id).toBe(userA.id);

      // Remove friend
      const removed = await db.removeFriend(userA.id, userB.id);
      expect(removed).toBe(true);

      expect((await db.listFriends(userA.id)).length).toBe(0);
      expect((await db.listFriends(userB.id)).length).toBe(0);
    });

    it("allows canceling a pending outgoing friend request", async () => {
      const userA = db.memoryStore.upsertUser({ openId: "usr_a", name: "Alice" });
      const userB = db.memoryStore.upsertUser({ openId: "usr_b", name: "Bob" });

      const req = await db.sendFriendRequest(userA.id, userB.id);
      expect(req.status).toBe("pending");

      const canceled = await db.cancelFriendRequest(req.id, userA.id);
      expect(canceled).toBe(true);

      const pending = await db.listPendingFriendRequestsDetailed(userB.id);
      expect(pending.incoming.length).toBe(0);
    });
  });

  describe("3. Ghost Mode & Privacy Visibility", () => {
    it("respects Ghost Mode and hides real-time activity and presence from friends", async () => {
      const host = db.memoryStore.upsertUser({
        openId: "host_usr",
        name: "Host User",
        isOnline: true,
        ghostMode: false,
      });

      const friendGhost = db.memoryStore.upsertUser({
        openId: "ghost_usr",
        name: "Stealth Friend",
        isOnline: true,
        ghostMode: true, // Ghost Mode enabled
      });

      const friendPublic = db.memoryStore.upsertUser({
        openId: "public_usr",
        name: "Visible Friend",
        isOnline: true,
        ghostMode: false,
      });

      // Establish friendships
      const req1 = await db.sendFriendRequest(host.id, friendGhost.id);
      await db.respondFriendRequest(req1.id, friendGhost.id, "accept");

      const req2 = await db.sendFriendRequest(host.id, friendPublic.id);
      await db.respondFriendRequest(req2.id, friendPublic.id, "accept");

      // Create an active room that friendPublic is watching
      const room = await db.createRoom({
        code: "PO-CINEMA",
        title: "Dune Part Two Co-watch",
        contentUrl: "https://www.youtube.com/watch?v=Way9Dexny3w",
        hostId: friendPublic.id,
        category: "movies",
        platform: "youtube",
        privacyMode: "public",
        accessMode: "open",
        isPlaying: true,
        viewerCount: 5,
      });

      await db.updateUserLiveActivity(friendPublic.id, {
        isOnline: true,
        currentRoomCode: room.code,
        currentActivityTitle: room.title,
        currentActivityPlatform: room.platform,
      });

      const activityList = await db.getFriendsActivity(host.id);
      expect(activityList.length).toBe(2);

      // Ghost friend should show status GHOST without active room leak
      const ghostEntry = activityList.find((a) => a.friend.id === friendGhost.id);
      expect(ghostEntry?.status).toBe("GHOST");
      expect(ghostEntry?.activity).toBeUndefined();

      // Visible friend should show WATCHING with room metadata
      const visibleEntry = activityList.find((a) => a.friend.id === friendPublic.id);
      expect(visibleEntry?.status).toBe("WATCHING");
      expect(visibleEntry?.activity?.roomCode).toBe("PO-CINEMA");
      expect(visibleEntry?.activity?.roomTitle).toBe("Dune Part Two Co-watch");
    });
  });

  describe("4. Force Sync Engine 2.0 Multi-Tier Drift Correction", () => {
    it("ignores imperceptible micro-drifts under 150ms", () => {
      const correction = computeForceSyncCorrection(10.0, 10.08); // 80ms drift
      expect(correction.tier).toBe("ignore");
      expect(correction.requiresSeek).toBe(false);
      expect(correction.suggestedPlaybackRate).toBe(1.0);
    });

    it("applies gentle 3% rate correction for minor drifts (150ms - 400ms)", () => {
      // Local is slightly behind authoritative position (250ms behind)
      const correctionBehind = computeForceSyncCorrection(10.0, 10.25);
      expect(correctionBehind.tier).toBe("gentle_nudge");
      expect(correctionBehind.requiresSeek).toBe(false);
      expect(correctionBehind.suggestedPlaybackRate).toBe(1.03); // slightly faster to catch up

      // Local is slightly ahead of authoritative position (300ms ahead)
      const correctionAhead = computeForceSyncCorrection(10.3, 10.0);
      expect(correctionAhead.tier).toBe("gentle_nudge");
      expect(correctionAhead.requiresSeek).toBe(false);
      expect(correctionAhead.suggestedPlaybackRate).toBe(0.97); // slightly slower to let room catch up
    });

    it("applies stronger 8% rate correction for moderate drifts (400ms - 1000ms)", () => {
      const correction = computeForceSyncCorrection(10.0, 10.7); // 700ms behind
      expect(correction.tier).toBe("strong_nudge");
      expect(correction.requiresSeek).toBe(false);
      expect(correction.suggestedPlaybackRate).toBe(1.08);
    });

    it("triggers controlled seek for major drifts (1000ms - 2000ms)", () => {
      const correction = computeForceSyncCorrection(10.0, 11.5); // 1500ms behind
      expect(correction.tier).toBe("controlled_seek");
      expect(correction.requiresSeek).toBe(true);
      expect(correction.targetPosition).toBe(11.5);
    });

    it("executes hard instant sync for severe drifts (> 2000ms)", () => {
      const correction = computeForceSyncCorrection(10.0, 25.0); // 15s desync
      expect(correction.tier).toBe("hard_sync");
      expect(correction.requiresSeek).toBe(true);
      expect(correction.targetPosition).toBe(25.0);
    });
  });

  describe("5. World Discovery & Party Aggregations", () => {
    it("aggregates global world statistics and platform breakdowns", async () => {
      const host = db.memoryStore.upsertUser({ openId: "host_w", name: "World Host" });

      await db.createRoom({
        code: "PO-WLD001",
        title: "Twitch Esports Finals",
        contentUrl: "https://twitch.tv/riotgames",
        hostId: host.id,
        category: "gaming",
        platform: "twitch",
        privacyMode: "public",
        accessMode: "open",
        viewerCount: 15,
      });

      await db.createRoom({
        code: "PO-WLD002",
        title: "Lo-Fi Beats 24/7",
        contentUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        hostId: host.id,
        category: "music",
        platform: "youtube",
        privacyMode: "public",
        accessMode: "open",
        viewerCount: 25,
      });

      const stats = await db.getWorldStats();
      expect(stats.activeParties).toBe(2);
      expect(stats.totalViewers).toBe(40);
      expect(stats.categoryBreakdown["gaming"]).toBe(1);
      expect(stats.categoryBreakdown["music"]).toBe(1);
      expect(stats.platformBreakdown["twitch"]).toBe(1);
      expect(stats.platformBreakdown["youtube"]).toBe(1);

      // Search & category filtering in World
      const gamingParties = await db.listWorldParties({ category: "gaming" });
      expect(gamingParties.total).toBe(1);
      expect(gamingParties.parties[0].title).toBe("Twitch Esports Finals");
      expect(gamingParties.parties[0].hostName).toBe("World Host");
    });
  });
});
