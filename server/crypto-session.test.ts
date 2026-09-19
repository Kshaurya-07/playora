import { describe, expect, it } from "vitest";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { validateStartupEnvironment, getSystemDiagnostics } from "./_core/envValidator";
import * as db from "./db";
import { resolveStreamingContent } from "@shared/universal-streaming-engine";

describe("PlayOra Security & Crypto Session Engine", () => {
  it("resolves a non-empty, cryptographically secure session key", () => {
    expect(ENV.cookieSecret).toBeDefined();
    expect(typeof ENV.cookieSecret).toBe("string");
    expect(ENV.cookieSecret.length).toBeGreaterThanOrEqual(32);
    expect(ENV.cookieSecret).not.toBe("");
  });

  it("successfully signs and verifies session JWTs without zero-length key error", async () => {
    const testOpenId = "test_user_" + Date.now();
    const token = await sdk.createSessionToken(testOpenId, {
      name: "Test Host",
      expiresInMs: 3600000,
    });

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // Standard 3-part JWT header.payload.signature

    const verified = await sdk.verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.openId).toBe(testOpenId);
    expect(verified?.name).toBe("Test Host");
  });

  it("passes startup environment validation", () => {
    const validation = validateStartupEnvironment();
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("gracefully runs startup environment validation in production mode without explicit JWT_SECRET", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      const validation = validateStartupEnvironment();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("returns full system diagnostics reporting all engines green", async () => {
    const report = await getSystemDiagnostics();
    expect(report.environment.backendReachable).toBe(true);
    expect(report.environment.authenticationConfigured).toBe(true);
    expect(report.environment.encryptionConfigured).toBe(true);
    expect(report.environment.websocketConfigured).toBe(true);
    expect(report.streaming.urlParserWorking).toBe(true);
    expect(report.streaming.youtubeAdapterReady).toBe(true);
    expect(report.room.roomCreationReady).toBe(true);
  });

  it("executes the complete Launch Party flow end-to-end without crypto errors", async () => {
    // 1. URL resolution
    const youtubeUrl = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
    const resolved = resolveStreamingContent(youtubeUrl);
    expect(resolved.platform).toBe("youtube");
    expect(resolved.contentId).toBe("M7lc1UVf-VE");
    expect(resolved.capabilities.syncCapability).toBe("automatic");

    // 2. User provision & session token generation (the exact step that previously failed)
    const guestUser = await db.upsertUser({
      openId: "guest_launch_test",
      name: "Party Host",
      avatarColor: "#D6FF3F",
      loginMethod: "guest",
      role: "user",
    });
    expect(guestUser.id).toBeDefined();

    const sessionToken = await sdk.createSessionToken(guestUser.openId, {
      name: guestUser.name,
      expiresInMs: 31536000000,
    });
    expect(sessionToken).toBeTruthy();

    // 3. Room creation in DB
    const room = await db.createRoom({
      code: "TESTROOM",
      title: "Friday Movie Night",
      platform: resolved.platform,
      contentUrl: resolved.normalizedUrl,
      hostId: guestUser.id,
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

    expect(room.id).toBeDefined();
    expect(room.code).toBe("TESTROOM");
    expect(room.contentUrl).toBe(resolved.normalizedUrl);
    expect(room.platform).toBe("youtube");

    // 4. Retrieve room
    const fetched = await db.getRoomByCode("TESTROOM");
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe("Friday Movie Night");
  });
});
