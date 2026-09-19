export * from "./universal-streaming-engine";
import {
  resolveStreamingContent,
  PLATFORM_REGISTRY,
  PlatformId,
  SyncCapability,
  DriftStatus,
  formatTimecode,
  buildInvitePath,
  projectPosition,
  classifyDrift,
  ResolvedContent,
} from "./universal-streaming-engine";

export type AdapterMode = "automatic" | "manual";

export function getYouTubeVideoId(value: string): string | null {
  const resolved = resolveStreamingContent(value);
  return resolved.platform === "youtube" ? resolved.contentId : null;
}

export function isYouTubeLiveUrl(value: string): boolean {
  const resolved = resolveStreamingContent(value);
  return resolved.platform === "youtube" && resolved.isLive;
}

export function getTwitchTarget(
  value: string
): { type: "channel" | "video"; id: string } | null {
  const resolved = resolveStreamingContent(value);
  if (resolved.platform === "twitch") {
    return {
      type: resolved.contentType === "vod" ? "video" : "channel",
      id: resolved.contentId,
    };
  }
  return null;
}

export function getKickChannel(value: string): string | null {
  const resolved = resolveStreamingContent(value);
  return resolved.platform === "kick" ? resolved.contentId : null;
}

export function detectPlatform(value: string): PlatformId {
  const resolved = resolveStreamingContent(value);
  return resolved.platform;
}

export function getPlatformCapability(platform: string): SyncCapability {
  const normalized = platform.toLowerCase().trim() as PlatformId;
  const match = PLATFORM_REGISTRY[normalized];
  return match ? match.capabilities.syncCapability : "assisted";
}

export function getAdapterMode(platform: string): AdapterMode {
  return getPlatformCapability(platform) === "automatic" ? "automatic" : "manual";
}
