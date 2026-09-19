export type SyncCapability = "automatic" | "assisted" | "unsupported";
export type DriftStatus = "synced" | "slight-drift" | "out-of-sync";

export type PlatformId =
  | "youtube"
  | "twitch"
  | "kick"
  | "vimeo"
  | "html5"
  | "netflix"
  | "prime"
  | "hotstar"
  | "disney"
  | "max"
  | "hulu"
  | "sonyliv"
  | "zee5"
  | "crunchyroll"
  | "generic";

export type ContentType = "video" | "live" | "vod" | "clip" | "ott" | "file";

export interface PlatformCapabilities {
  supportsEmbed: boolean;
  supportsDirectControls: boolean;
  supportsSeeking: boolean;
  supportsPlaybackRate: boolean;
  syncCapability: SyncCapability;
}

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  category: "free-streaming" | "live-broadcast" | "ott-subscription" | "custom";
  brandColor: string;
  badgeLabel: string;
  defaultUrl: string;
  placeholder: string;
  description: string;
  capabilities: PlatformCapabilities;
}

export interface ResolvedContent {
  rawUrl: string;
  normalizedUrl: string;
  platform: PlatformId;
  platformName: string;
  contentId: string;
  contentType: ContentType;
  isLive: boolean;
  title?: string;
  initialTimecode?: number;
  capabilities: PlatformCapabilities;
}

export const PLATFORM_REGISTRY: Record<PlatformId, PlatformMeta> = {
  youtube: {
    id: "youtube",
    name: "YouTube",
    category: "free-streaming",
    brandColor: "#FF0000",
    badgeLabel: "🟢 Automatic Sync",
    defaultUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
    placeholder: "Paste any YouTube link (watch, youtu.be, shorts, live)",
    description: "Official YouTube IFrame Player with automated play, pause, seek, and drift synchronization.",
    capabilities: {
      supportsEmbed: true,
      supportsDirectControls: true,
      supportsSeeking: true,
      supportsPlaybackRate: true,
      syncCapability: "automatic",
    },
  },
  twitch: {
    id: "twitch",
    name: "Twitch",
    category: "live-broadcast",
    brandColor: "#9146FF",
    badgeLabel: "🟢 Automatic Sync",
    defaultUrl: "https://www.twitch.tv/twitch",
    placeholder: "https://www.twitch.tv/{channel} or /videos/{id}",
    description: "Official Twitch Interactive Player for live streams and VODs with automated sync.",
    capabilities: {
      supportsEmbed: true,
      supportsDirectControls: true,
      supportsSeeking: true,
      supportsPlaybackRate: false,
      syncCapability: "automatic",
    },
  },
  kick: {
    id: "kick",
    name: "Kick",
    category: "live-broadcast",
    brandColor: "#53FC18",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://kick.com/xqc",
    placeholder: "https://kick.com/{channel}",
    description: "Embeds Kick live streams with shared room timeline, countdowns, and live sync indicators.",
    capabilities: {
      supportsEmbed: true,
      supportsDirectControls: false,
      supportsSeeking: false,
      supportsPlaybackRate: false,
      syncCapability: "assisted",
    },
  },
  vimeo: {
    id: "vimeo",
    name: "Vimeo",
    category: "free-streaming",
    brandColor: "#1AB7EA",
    badgeLabel: "🟢 Automatic Sync",
    defaultUrl: "https://vimeo.com/76979871",
    placeholder: "https://vimeo.com/{id}",
    description: "Official Vimeo Player SDK with automatic play, pause, seek, and duration tracking.",
    capabilities: {
      supportsEmbed: true,
      supportsDirectControls: true,
      supportsSeeking: true,
      supportsPlaybackRate: true,
      syncCapability: "automatic",
    },
  },
  html5: {
    id: "html5",
    name: "Direct Video (MP4/WebM)",
    category: "custom",
    brandColor: "#00E5FF",
    badgeLabel: "🟢 Automatic Sync",
    defaultUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    placeholder: "https://.../video.mp4 or .webm",
    description: "Native HTML5 video player with sub-second synchronization, seeking, and custom controls.",
    capabilities: {
      supportsEmbed: true,
      supportsDirectControls: true,
      supportsSeeking: true,
      supportsPlaybackRate: true,
      syncCapability: "automatic",
    },
  },
  netflix: {
    id: "netflix",
    name: "Netflix",
    category: "ott-subscription",
    brandColor: "#E50914",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.netflix.com/watch/80057281",
    placeholder: "https://www.netflix.com/watch/...",
    description: "Watch on your personal Netflix account. PlayOra synchronizes playback with countdowns and alerts.",
    capabilities: {
      supportsEmbed: false,
      supportsDirectControls: false,
      supportsSeeking: false,
      supportsPlaybackRate: false,
      syncCapability: "assisted",
    },
  },
  prime: {
    id: "prime",
    name: "Prime Video",
    category: "ott-subscription",
    brandColor: "#00A8E1",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.primevideo.com/detail/0S3M27S5W1K8PZJ8G8J7S1M2",
    placeholder: "https://www.primevideo.com/detail/...",
    description: "Watch on your Prime Video account with synchronized play, pause, and timestamp alerts.",
    capabilities: {
      supportsEmbed: false,
      supportsDirectControls: false,
      supportsSeeking: false,
      supportsPlaybackRate: false,
      syncCapability: "assisted",
    },
  },
  hotstar: {
    id: "hotstar",
    name: "JioHotstar",
    category: "ott-subscription",
    brandColor: "#113B92",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.hotstar.com/movies/...",
    placeholder: "https://www.hotstar.com/...",
    description: "Stream on your JioHotstar account. PlayOra provides shared timeline & audio-visual countdowns.",
    capabilities: {
      supportsEmbed: false,
      supportsDirectControls: false,
      supportsSeeking: false,
      supportsPlaybackRate: false,
      syncCapability: "assisted",
    },
  },
  disney: {
    id: "disney",
    name: "Disney+",
    category: "ott-subscription",
    brandColor: "#113CCF",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.disneyplus.com/video/...",
    placeholder: "https://www.disneyplus.com/...",
    description: "Synchronized companion room with voice, chat, reactions, and 3-2-1 playback alerts.",
    capabilities: {
      supportsEmbed: false,
      supportsDirectControls: false,
      supportsSeeking: false,
      supportsPlaybackRate: false,
      syncCapability: "assisted",
    },
  },
  max: {
    id: "max",
    name: "Max",
    category: "ott-subscription",
    brandColor: "#002BE7",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://play.max.com/video/watch/...",
    placeholder: "https://play.max.com/...",
    description: "Synchronized companion room with master timecode and voice chat for Max titles.",
    capabilities: {
      supportsEmbed: false,
      supportsDirectControls: false,
      supportsSeeking: false,
      supportsPlaybackRate: false,
      syncCapability: "assisted",
    },
  },
  hulu: {
    id: "hulu",
    name: "Hulu",
    category: "ott-subscription",
    brandColor: "#1CE783",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.hulu.com/watch/...",
    placeholder: "https://www.hulu.com/...",
    description: "Stream together on your Hulu subscription with synchronized timecode alerts.",
    capabilities: {
      supportsEmbed: false,
      supportsDirectControls: false,
      supportsSeeking: false,
      supportsPlaybackRate: false,
      syncCapability: "assisted",
    },
  },
  sonyliv: {
    id: "sonyliv",
    name: "SonyLIV",
    category: "ott-subscription",
    brandColor: "#FF6B00",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.sonyliv.com/shows/...",
    placeholder: "https://www.sonyliv.com/...",
    description: "Stream on SonyLIV while PlayOra synchronizes party members across personal devices.",
    capabilities: {
      supportsEmbed: false,
      supportsDirectControls: false,
      supportsSeeking: false,
      supportsPlaybackRate: false,
      syncCapability: "assisted",
    },
  },
  zee5: {
    id: "zee5",
    name: "ZEE5",
    category: "ott-subscription",
    brandColor: "#8230C6",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.zee5.com/movies/...",
    placeholder: "https://www.zee5.com/...",
    description: "Synchronized social companion for ZEE5 content with real-time chat and voice.",
    capabilities: {
      supportsEmbed: false,
      supportsDirectControls: false,
      supportsSeeking: false,
      supportsPlaybackRate: false,
      syncCapability: "assisted",
    },
  },
  crunchyroll: {
    id: "crunchyroll",
    name: "Crunchyroll",
    category: "ott-subscription",
    brandColor: "#F47521",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.crunchyroll.com/watch/...",
    placeholder: "https://www.crunchyroll.com/watch/...",
    description: "Enjoy anime together on your Crunchyroll account with synchronized timestamps & voice.",
    capabilities: {
      supportsEmbed: false,
      supportsDirectControls: false,
      supportsSeeking: false,
      supportsPlaybackRate: false,
      syncCapability: "assisted",
    },
  },
  generic: {
    id: "generic",
    name: "Generic Web Stream",
    category: "custom",
    brandColor: "#D6FF3F",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://example.com/video",
    placeholder: "https://...",
    description: "Synchronized timecode companion for any external video, podcast, or web stream.",
    capabilities: {
      supportsEmbed: false,
      supportsDirectControls: false,
      supportsSeeking: false,
      supportsPlaybackRate: false,
      syncCapability: "assisted",
    },
  },
};

export const PLATFORM_LIST = Object.values(PLATFORM_REGISTRY);

/**
 * Normalizes any user-pasted URL string by trimming whitespace,
 * stripping tracking parameters, and handling protocol-relative inputs.
 */
export function normalizeUrl(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim();

  // Strip enclosing quotes or brackets
  clean = clean.replace(/^[<"']+|[>"']+$/g, "");

  // If raw string is an 11-char YouTube ID, return canonical YouTube URL
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return `https://www.youtube.com/watch?v=${clean}`;
  }

  // Prepend https if protocol is omitted
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `https://${clean}`;
  }

  try {
    const url = new URL(clean);
    // Strip common tracking and referral query parameters while preserving video parameters
    const trackingParams = [
      "si",
      "feature",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "ref",
      "ref_src",
    ];
    trackingParams.forEach((param) => url.searchParams.delete(param));
    return url.toString();
  } catch {
    return clean;
  }
}

/**
 * Universal content resolver that inspects any URL and returns structured
 * metadata, platform ID, content ID, and capabilities.
 */
export function resolveStreamingContent(rawUrl: string): ResolvedContent {
  const normalized = normalizeUrl(rawUrl);

  // Default fallback
  const fallbackMeta = PLATFORM_REGISTRY.generic;
  const fallback: ResolvedContent = {
    rawUrl,
    normalizedUrl: normalized,
    platform: "generic",
    platformName: fallbackMeta.name,
    contentId: normalized,
    contentType: "ott",
    isLive: false,
    capabilities: fallbackMeta.capabilities,
  };

  if (!normalized) return fallback;

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return fallback;
  }

  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname;

  // 1. YouTube Resolver
  if (
    hostname === "youtu.be" ||
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com")
  ) {
    let videoId: string | null = null;
    let isLive = false;
    let contentType: ContentType = "video";
    let initialTimecode: number | undefined;

    // Parse time parameter (e.g. t=120 or t=2m10s)
    const tParam = url.searchParams.get("t");
    if (tParam) {
      const matchSeconds = tParam.match(/^(\d+)s?$/);
      if (matchSeconds) {
        initialTimecode = parseInt(matchSeconds[1], 10);
      }
    }

    if (hostname === "youtu.be") {
      videoId = pathname.slice(1).split("/")[0] || null;
    } else if (pathname === "/watch" || pathname === "/watch/") {
      videoId = url.searchParams.get("v");
    } else if (pathname.startsWith("/embed/")) {
      videoId = pathname.split("/")[2] || null;
    } else if (pathname.startsWith("/v/")) {
      videoId = pathname.split("/")[2] || null;
    } else if (pathname.startsWith("/shorts/")) {
      videoId = pathname.split("/")[2] || null;
      contentType = "clip";
    } else if (pathname.startsWith("/live/")) {
      videoId = pathname.split("/")[2] || null;
      isLive = true;
      contentType = "live";
    } else if (pathname.includes("/live")) {
      isLive = true;
      contentType = "live";
      videoId = url.searchParams.get("v") || "live";
    }

    if (url.searchParams.get("live") === "1" || url.searchParams.has("live_stream")) {
      isLive = true;
      contentType = "live";
    }

    if (videoId) {
      // Strip any residual query suffix from ID
      videoId = videoId.split("?")[0].split("&")[0];
      const meta = PLATFORM_REGISTRY.youtube;
      return {
        rawUrl,
        normalizedUrl: normalized,
        platform: "youtube",
        platformName: meta.name,
        contentId: videoId,
        contentType,
        isLive,
        initialTimecode,
        capabilities: meta.capabilities,
      };
    }
  }

  // 2. Twitch Resolver
  if (hostname === "twitch.tv" || hostname.endsWith(".twitch.tv")) {
    const parts = pathname.split("/").filter(Boolean);
    const meta = PLATFORM_REGISTRY.twitch;

    // VOD: twitch.tv/videos/123456789
    if (parts[0] === "videos" && parts[1]) {
      return {
        rawUrl,
        normalizedUrl: normalized,
        platform: "twitch",
        platformName: meta.name,
        contentId: parts[1],
        contentType: "vod",
        isLive: false,
        capabilities: meta.capabilities,
      };
    }

    // Clip: clips.twitch.tv/{clipId} or twitch.tv/{channel}/clip/{clipId}
    if (hostname === "clips.twitch.tv" && parts[0]) {
      return {
        rawUrl,
        normalizedUrl: normalized,
        platform: "twitch",
        platformName: meta.name,
        contentId: parts[0],
        contentType: "clip",
        isLive: false,
        capabilities: meta.capabilities,
      };
    }
    if (parts[1] === "clip" && parts[2]) {
      return {
        rawUrl,
        normalizedUrl: normalized,
        platform: "twitch",
        platformName: meta.name,
        contentId: parts[2],
        contentType: "clip",
        isLive: false,
        capabilities: meta.capabilities,
      };
    }

    // Live Channel: twitch.tv/{channel}
    if (parts[0] && !["directory", "downloads", "p", "jobs", "wallet"].includes(parts[0])) {
      return {
        rawUrl,
        normalizedUrl: normalized,
        platform: "twitch",
        platformName: meta.name,
        contentId: parts[0],
        contentType: "live",
        isLive: true,
        capabilities: meta.capabilities,
      };
    }
  }

  // 3. Kick Resolver
  if (hostname === "kick.com" || hostname.endsWith(".kick.com")) {
    const parts = pathname.split("/").filter(Boolean);
    const meta = PLATFORM_REGISTRY.kick;

    if (parts[0] && !["video", "categories", "privacy-policy", "terms-of-service"].includes(parts[0])) {
      return {
        rawUrl,
        normalizedUrl: normalized,
        platform: "kick",
        platformName: meta.name,
        contentId: parts[0],
        contentType: "live",
        isLive: true,
        capabilities: meta.capabilities,
      };
    }
  }

  // 4. Vimeo Resolver
  if (hostname === "vimeo.com" || hostname.endsWith(".vimeo.com")) {
    const parts = pathname.split("/").filter(Boolean);
    const meta = PLATFORM_REGISTRY.vimeo;
    const vimeoId = parts[0] || (parts[1] && !isNaN(Number(parts[1])) ? parts[1] : null);

    if (vimeoId && (!isNaN(Number(vimeoId)) || vimeoId.length > 5)) {
      return {
        rawUrl,
        normalizedUrl: normalized,
        platform: "vimeo",
        platformName: meta.name,
        contentId: vimeoId,
        contentType: "video",
        isLive: false,
        capabilities: meta.capabilities,
      };
    }
  }

  // 5. Direct HTML5 Video Resolver (.mp4, .webm, .m3u8, .mov)
  const lowerPath = pathname.toLowerCase();
  if (
    lowerPath.endsWith(".mp4") ||
    lowerPath.endsWith(".webm") ||
    lowerPath.endsWith(".ogv") ||
    lowerPath.endsWith(".mov") ||
    lowerPath.endsWith(".m3u8")
  ) {
    const meta = PLATFORM_REGISTRY.html5;
    return {
      rawUrl,
      normalizedUrl: normalized,
      platform: "html5",
      platformName: meta.name,
      contentId: normalized,
      contentType: lowerPath.endsWith(".m3u8") ? "live" : "file",
      isLive: lowerPath.endsWith(".m3u8"),
      capabilities: meta.capabilities,
    };
  }

  // 6. Protected OTT Platforms
  if (hostname.includes("netflix.com")) {
    const meta = PLATFORM_REGISTRY.netflix;
    return {
      rawUrl,
      normalizedUrl: normalized,
      platform: "netflix",
      platformName: meta.name,
      contentId: pathname,
      contentType: "ott",
      isLive: false,
      capabilities: meta.capabilities,
    };
  }

  if (hostname.includes("primevideo.com") || hostname.includes("amazon.com")) {
    const meta = PLATFORM_REGISTRY.prime;
    return {
      rawUrl,
      normalizedUrl: normalized,
      platform: "prime",
      platformName: meta.name,
      contentId: pathname,
      contentType: "ott",
      isLive: false,
      capabilities: meta.capabilities,
    };
  }

  if (hostname.includes("hotstar.com")) {
    const meta = PLATFORM_REGISTRY.hotstar;
    return {
      rawUrl,
      normalizedUrl: normalized,
      platform: "hotstar",
      platformName: meta.name,
      contentId: pathname,
      contentType: "ott",
      isLive: false,
      capabilities: meta.capabilities,
    };
  }

  if (hostname.includes("disneyplus.com")) {
    const meta = PLATFORM_REGISTRY.disney;
    return {
      rawUrl,
      normalizedUrl: normalized,
      platform: "disney",
      platformName: meta.name,
      contentId: pathname,
      contentType: "ott",
      isLive: false,
      capabilities: meta.capabilities,
    };
  }

  if (hostname.includes("max.com")) {
    const meta = PLATFORM_REGISTRY.max;
    return {
      rawUrl,
      normalizedUrl: normalized,
      platform: "max",
      platformName: meta.name,
      contentId: pathname,
      contentType: "ott",
      isLive: false,
      capabilities: meta.capabilities,
    };
  }

  if (hostname.includes("hulu.com")) {
    const meta = PLATFORM_REGISTRY.hulu;
    return {
      rawUrl,
      normalizedUrl: normalized,
      platform: "hulu",
      platformName: meta.name,
      contentId: pathname,
      contentType: "ott",
      isLive: false,
      capabilities: meta.capabilities,
    };
  }

  if (hostname.includes("sonyliv.com")) {
    const meta = PLATFORM_REGISTRY.sonyliv;
    return {
      rawUrl,
      normalizedUrl: normalized,
      platform: "sonyliv",
      platformName: meta.name,
      contentId: pathname,
      contentType: "ott",
      isLive: false,
      capabilities: meta.capabilities,
    };
  }

  if (hostname.includes("zee5.com")) {
    const meta = PLATFORM_REGISTRY.zee5;
    return {
      rawUrl,
      normalizedUrl: normalized,
      platform: "zee5",
      platformName: meta.name,
      contentId: pathname,
      contentType: "ott",
      isLive: false,
      capabilities: meta.capabilities,
    };
  }

  if (hostname.includes("crunchyroll.com")) {
    const meta = PLATFORM_REGISTRY.crunchyroll;
    return {
      rawUrl,
      normalizedUrl: normalized,
      platform: "crunchyroll",
      platformName: meta.name,
      contentId: pathname,
      contentType: "ott",
      isLive: false,
      capabilities: meta.capabilities,
    };
  }

  return fallback;
}

export function classifyDrift(seconds: number): DriftStatus {
  const absolute = Math.abs(seconds);
  if (absolute < 0.5) return "synced";
  if (absolute <= 2.0) return "slight-drift";
  return "out-of-sync";
}

export function formatTimecode(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function buildInvitePath(code: string): string {
  return `/party/${code.trim().toUpperCase()}`;
}

export function projectPosition(
  position: number,
  elapsedSeconds: number,
  isPlaying: boolean
): number {
  if (!isPlaying) return Math.max(0, position);
  return Math.max(0, position + Math.max(0, elapsedSeconds));
}
