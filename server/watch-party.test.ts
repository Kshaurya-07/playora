import { describe, expect, it } from "vitest";
import {
  buildInvitePath,
  classifyDrift,
  getAdapterMode,
  projectPosition,
} from "../shared/watch-party";

describe("watch party synchronization helpers", () => {
  it("uses automatic mode only for integrations with permitted controls", () => {
    expect(getAdapterMode("YouTube")).toBe("automatic");
    expect(getAdapterMode(" Twitch ")).toBe("automatic");
    expect(getAdapterMode("Netflix")).toBe("manual");
    expect(getAdapterMode("JioHotstar")).toBe("manual");
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
});
