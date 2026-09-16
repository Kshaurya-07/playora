import { describe, expect, it } from "vitest";
import {
  buildInvitePath,
  classifyDrift,
  detectPlatform,
  formatTimecode,
  getAdapterMode,
  getKickChannel,
  getPlatformCapability,
  getTwitchTarget,
  getYouTubeVideoId,
  isYouTubeLiveUrl,
  projectPosition,
} from "../shared/watch-party";
import * as db from "./db";

describe("watch party synchronization helpers", () => {
  it("uses automatic mode only for integrations with permitted controls", () => {
    expect(getAdapterMode("YouTube")).toBe("automatic");
    expect(getAdapterMode(" Twitch ")).toBe("automatic");
    expect(getAdapterMode("Netflix")).toBe("manual");
    expect(getAdapterMode("JioHotstar")).toBe("manual");
  });

  it("extracts IDs from supported YouTube URL shapes", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=M7lc1UVf-VE")).toBe("M7lc1UVf-VE");
    expect(getYouTubeVideoId("https://youtu.be/M7lc1UVf-VE")).toBe("M7lc1UVf-VE");
    expect(getYouTubeVideoId("https://www.youtube.com/embed/M7lc1UVf-VE")).toBe("M7lc1UVf-VE");
    expect(getYouTubeVideoId("https://www.youtube.com/shorts/M7lc1UVf-VE")).toBe("M7lc1UVf-VE");
    expect(getYouTubeVideoId("https://www.youtube.com/live/M7lc1UVf-VE")).toBe("M7lc1UVf-VE");
    expect(getYouTubeVideoId("https://example.com/video/M7lc1UVf-VE")).toBeNull();
  });

  it("detects YouTube live URLs", () => {
    expect(isYouTubeLiveUrl("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeLiveUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&live=1")).toBe(true);
    expect(isYouTubeLiveUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
  });

  it("extracts Twitch channels and VODs", () => {
    expect(getTwitchTarget("https://www.twitch.tv/shroud")).toEqual({
      type: "channel",
      id: "shroud",
    });
    expect(getTwitchTarget("https://twitch.tv/videos/123456789")).toEqual({
      type: "video",
      id: "123456789",
    });
  });

  it("extracts Kick channels", () => {
    expect(getKickChannel("https://kick.com/xqc")).toBe("xqc");
    expect(getKickChannel("https://kick.com/hikaru")).toBe("hikaru");
  });

  it("detects streaming platforms accurately", () => {
    expect(detectPlatform("https://www.netflix.com/watch/80057281")).toBe("netflix");
    expect(detectPlatform("https://www.primevideo.com/detail/xyz")).toBe("prime");
    expect(detectPlatform("https://www.hotstar.com/movies/123")).toBe("hotstar");
    expect(detectPlatform("https://www.disneyplus.com/video/456")).toBe("disney");
    expect(detectPlatform("https://www.sonyliv.com/shows/789")).toBe("sonyliv");
    expect(detectPlatform("https://www.zee5.com/movies/abc")).toBe("zee5");
    expect(detectPlatform("https://www.crunchyroll.com/watch/def")).toBe("crunchyroll");
    expect(detectPlatform("https://kick.com/streamer")).toBe("kick");
    expect(detectPlatform("https://unknown.com/video")).toBe("generic");
  });

  it("correctly identifies platform sync capabilities", () => {
    expect(getPlatformCapability("youtube")).toBe("automatic");
    expect(getPlatformCapability("twitch")).toBe("automatic");
    expect(getPlatformCapability("kick")).toBe("assisted");
    expect(getPlatformCapability("netflix")).toBe("assisted");
    expect(getPlatformCapability("prime")).toBe("assisted");
    expect(getPlatformCapability("hotstar")).toBe("assisted");
    expect(getPlatformCapability("disney")).toBe("assisted");
  });

  it("classifies drift using the product thresholds", () => {
    expect(classifyDrift(0.49)).toBe("synced");
    expect(classifyDrift(-0.5)).toBe("slight-drift");
    expect(classifyDrift(2)).toBe("slight-drift");
    expect(classifyDrift(2.01)).toBe("out-of-sync");
  });

  it("normalizes invite paths and never returns a media URL", () => {
    expect(buildInvitePath("  fri5nite ")).toBe("/party/FRI5NITE");
  });

  it("projects a playing position without moving paused playback", () => {
    expect(projectPosition(100, 3, true)).toBe(103);
    expect(projectPosition(100, -3, true)).toBe(100);
    expect(projectPosition(100, 3, false)).toBe(100);
  });

  it("formats timecodes cleanly for display", () => {
    expect(formatTimecode(45)).toBe("0:45");
    expect(formatTimecode(125)).toBe("2:05");
    expect(formatTimecode(5072)).toBe("1:24:32");
  });

  it("supports full room lifecycle in database / memory store", async () => {
    const room = await db.createRoom({
      code: "TESTROOM",
      title: "Test Watch Room",
      platform: "youtube",
      contentUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      hostId: 42,
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

    expect(room.code).toBe("TESTROOM");
    expect(room.title).toBe("Test Watch Room");

    const retrieved = await db.getRoomByCode("testroom");
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(room.id);

    // Playback state update
    await db.updateRoomPlayback(room.id, true, 45.5);
    const updated = await db.getRoomById(room.id);
    expect(updated?.isPlaying).toBe(true);
    expect(updated?.currentPosition).toBe(45.5);

    // Chat messages
    const msg = await db.addMessage({
      roomId: room.id,
      userId: 42,
      senderName: "Host Tester",
      senderColor: "#D6FF3F",
      content: "Hello everyone in party!",
      messageType: "chat",
    });
    expect(msg.content).toBe("Hello everyone in party!");

    const messages = await db.getRoomMessages(room.id);
    expect(messages.length).toBeGreaterThanOrEqual(1);

    // Message deletion
    const deleted = await db.deleteMessage(msg.id, 42, true);
    expect(deleted).toBe(true);
  });
});
