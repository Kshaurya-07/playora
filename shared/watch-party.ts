export type AdapterMode = "automatic" | "manual";
export type DriftStatus = "synced" | "slight-drift" | "out-of-sync";

const automaticPlatforms = new Set(["youtube", "twitch", "kick", "vimeo"]);

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
