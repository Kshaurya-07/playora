export type AdapterMode = "automatic" | "manual";
export type DriftStatus = "synced" | "slight-drift" | "out-of-sync";

const automaticPlatforms = new Set(["youtube", "twitch", "kick", "vimeo"]);

export function getYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] || null;
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] || null;
    }
  } catch {
    return null;
  }
  return null;
}

export function getAdapterMode(platform: string): AdapterMode {
  return automaticPlatforms.has(platform.trim().toLowerCase()) ? "automatic" : "manual";
}

export function classifyDrift(seconds: number): DriftStatus {
  const absolute = Math.abs(seconds);
  if (absolute < 0.5) return "synced";
  if (absolute <= 2) return "slight-drift";
  return "out-of-sync";
}

export function buildInvitePath(code: string): string {
  return `/party/${code.trim().toUpperCase()}`;
}

export function projectPosition(position: number, elapsedSeconds: number, isPlaying: boolean): number {
  if (!isPlaying) return Math.max(0, position);
  return Math.max(0, position + Math.max(0, elapsedSeconds));
}
