export type SyncCapability = "automatic" | "assisted" | "unsupported";
export type DriftStatus = "synced" | "slight-drift" | "out-of-sync";

export type PlatformId =
  | "youtube"
  | "twitch"
  | "kick"
  | "netflix"
  | "prime"
  | "hotstar"
  | "disney"
  | "sonyliv"
  | "zee5"
  | "crunchyroll"
  | "generic";

export interface PlatformInfo {
  id: PlatformId;
  name: string;
  category: "free-streaming" | "live-broadcast" | "ott-subscription" | "custom";
  syncCapability: SyncCapability;
  brandColor: string;
  badgeLabel: string;
  defaultUrl: string;
  placeholder: string;
  description: string;
  supportsEmbed: boolean;
  supportsDirectControls: boolean;
}

export const PLATFORM_REGISTRY: Record<PlatformId, PlatformInfo> = {
  youtube: {
    id: "youtube",
    name: "YouTube",
    category: "free-streaming",
    syncCapability: "automatic",
    brandColor: "#FF0000",
    badgeLabel: "🟢 Automatic Sync",
    defaultUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
    placeholder: "https://www.youtube.com/watch?v=... or youtu.be/...",
    description: "Official YouTube IFrame Player with automatic play, pause, seek, and drift synchronization.",
    supportsEmbed: true,
    supportsDirectControls: true,
  },
  twitch: {
    id: "twitch",
    name: "Twitch",
    category: "live-broadcast",
    syncCapability: "automatic",
    brandColor: "#9146FF",
    badgeLabel: "🟢 Automatic Sync",
    defaultUrl: "https://www.twitch.v/twitch",
    placeholder: "https://www.twitch.tv/{channel} or twitch.tv/videos/{id}",
    description: "Official Twitch Interactive Player for live broadcasts and VODs with automated live sync.",
    supportsEmbed: true,
    supportsDirectControls: true,
  },
  kick: {
    id: "kick",
    name: "Kick",
    category: "live-broadcast",
    syncCapability: "assisted",
    brandColor: "#53FC18",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://kick.com/xqc",
    placeholder: "https://kick.com/{channel}",
    description: "Embeds Kick live streams with shared room timeline, countdowns, and live sync indicators.",
    supportsEmbed: true,
    supportsDirectControls: false,
  },
  netflix: {
    id: "netflix",
    name: "Netflix",
    category: "ott-subscription",
    syncCapability: "assisted",
    brandColor: "#E50914",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.netflix.com/watch/80057281",
    placeholder: "https://www.netflix.com/watch/...",
    description: "Watch on your own Netflix account. PlayOra synchronizes playback with countdowns and alerts.",
    supportsEmbed: false,
    supportsDirectControls: false,
  },
  prime: {
    id: "prime",
    name: "Prime Video",
    category: "ott-subscription",
    syncCapability: "assisted",
    brandColor: "#00A8E1",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.primevideo.com/detail/0S3M27S5W1K8PZJ8G8J7S1M2",
    placeholder: "https://www.primevideo.com/detail/...",
    description: "Watch on your Prime Video account with synchronized play, pause, and timestamp alerts.",
    supportsEmbed: false,
    supportsDirectControls: false,
  },
  hotstar: {
    id: "hotstar",
    name: "JioHotstar",
    category: "ott-subscription",
    syncCapability: "assisted",
    brandColor: "#113B92",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.hotstar.com/movies/...",
    placeholder: "https://www.hotstar.com/...",
    description: "Stream on your JioHotstar account. PlayOra provides shared timeline & audio-visual countdowns.",
    supportsEmbed: false,
    supportsDirectControls: false,
  },
  disney: {
    id: "disney",
    name: "Disney+",
    category: "ott-subscription",
    syncCapability: "assisted",
    brandColor: "#113CCF",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.disneyplus.com/video/...",
    placeholder: "https://www.disneyplus.com/...",
    description: "Synchronized companion room with voice, chat, reactions, and 3-2-1 playback alerts.",
    supportsEmbed: false,
    supportsDirectControls: false,
  },
  sonyliv: {
    id: "sonyliv",
    name: "SonyLIV",
    category: "ott-subscription",
    syncCapability: "assisted",
    brandColor: "#FF6B00",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.sonyliv.com/shows/...",
    placeholder: "https://www.sonyliv.com/...",
    description: "Stream on SonyLIV while PlayOra synchronizes party members across personal devices.",
    supportsEmbed: false,
    supportsDirectControls: false,
  },
  zee5: {
    id: "zee5",
    name: "ZEE5",
    category: "ott-subscription",
    syncCapability: "assisted",
    brandColor: "#8230C6",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.zee5.com/movies/...",
    placeholder: "https://www.zee5.com/...",
    description: "Synchronized social companion for ZEE5 content with real-time chat and voice.",
    supportsEmbed: false,
    supportsDirectControls: false,
  },
  crunchyroll: {
    id: "crunchyroll",
    name: "Crunchyroll",
    category: "ott-subscription",
    syncCapability: "assisted",
    brandColor: "#F47521",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://www.crunchyroll.com/watch/...",
    placeholder: "https://www.crunchyroll.com/watch/...",
    description: "Enjoy anime together on your Crunchyroll account with synchronized timestamps & voice.",
    supportsEmbed: false,
    supportsDirectControls: false,
  },
  generic: {
    id: "generic",
    name: "Generic Web",
    category: "custom",
    syncCapability: "assisted",
    brandColor: "#D6FF3F",
    badgeLabel: "🟡 Assisted Sync",
    defaultUrl: "https://example.com/video",
    placeholder: "https://...",
    description: "Synchronized timecode companion for any external video, podcast, or web stream.",
    supportsEmbed: false,
    supportsDirectControls: false,
  },
};

export const PLATFORM_LIST = Object.values(PLATFORM_REGISTRY);

export function getYouTubeVideoId(value: string): string | null {
  if (!value) return null;
  try {
    const trimmed = value.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1).split("/")[0] || null;
    }
    if (url.hostname.endsWith("youtube.com") || url.hostname === "youtube.com") {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v") || null;
      }
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] || null;
      }
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/")[2] || null;
      }
      if (url.pathname.startsWith("/live/")) {
        return url.pathname.split("/")[2] || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function isYouTubeLiveUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.pathname.includes("/live") || url.searchParams.has("live");
  } catch {
    return false;
  }
}

export function getTwitchTarget(value: string): { type: "channel" | "video"; id: string } | null {
  if (!value) return null;
  try {
    const trimmed = value.trim();
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.hostname.endsWith("twitch.tv")) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "videos" && parts[1]) {
        return { type: "video", id: parts[1] };
      }
      if (parts[0] && !["directory", "p", "downloads", "jobs"].includes(parts[0])) {
        return { type: "channel", id: parts[0] };
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function getKickChannel(value: string): string | null {
  if (!value) return null;
  try {
    const trimmed = value.trim();
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.hostname.endsWith("kick.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] && !["video", "categories"].includes(parts[0])) {
        return parts[0];
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function detectPlatform(value: string): PlatformId {
  if (!value) return "generic";
  const trimmed = value.toLowerCase().trim();
  if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) return "youtube";
  if (trimmed.includes("twitch.tv")) return "twitch";
  if (trimmed.includes("kick.com")) return "kick";
  if (trimmed.includes("netflix.com")) return "netflix";
  if (trimmed.includes("primevideo.com") || trimmed.includes("amazon.com/gp/video")) return "prime";
  if (trimmed.includes("hotstar.com")) return "hotstar";
  if (trimmed.includes("disneyplus.com")) return "disney";
  if (trimmed.includes("sonyliv.com")) return "sonyliv";
  if (trimmed.includes("zee5.com")) return "zee5";
  if (trimmed.includes("crunchyroll.com")) return "crunchyroll";
  return "generic";
}

export function getPlatformCapability(platform: string): SyncCapability {
  const normalized = platform.toLowerCase().trim() as PlatformId;
  const match = PLATFORM_REGISTRY[normalized];
  return match ? match.syncCapability : "assisted";
}

export function classifyDrift(seconds: number): DriftStatus {
  const absolute = Math.abs(seconds);
  if (absolute < 0.5) return "synced";
  if (absolute <= 2.0) return "slight-drift";
  return "out-of-sync";
}

export function buildInvitePath(code: string): string {
  return `/party/${code.trim().toUpperCase()}`;
}

export function projectPosition(position: number, elapsedSeconds: number, isPlaying: boolean): number {
  if (!isPlaying) return Math.max(0, position);
  return Math.max(0, position + Math.max(0, elapsedSeconds));
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

export type AdapterMode = "automatic" | "manual";

export function getAdapterMode(platform: string): AdapterMode {
  return getPlatformCapability(platform) === "automatic" ? "automatic" : "manual";
}
