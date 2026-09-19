import { ResolvedContent } from "@shared/universal-streaming-engine";

export interface AdapterDiagnostics {
  platform: string;
  normalizedUrl: string;
  contentId: string;
  contentType: string;
  adapterName: string;
  embedAllowed: boolean;
  playerState: "uninitialized" | "initializing" | "ready" | "playing" | "paused" | "buffering" | "error";
  apiLoaded: boolean;
  error?: string;
  lastSyncTime?: number;
  liveLatency?: number;
}

export interface BaseAdapterProps {
  content: ResolvedContent;
  isHost: boolean;
  canControl: boolean;
  isPlaying: boolean;
  targetPosition: number;
  onPositionUpdate: (position: number, duration?: number) => void;
  onLocalPlaybackChange: (isPlaying: boolean, position: number) => void;
  onPlayerReady?: () => void;
  onDiagnosticsUpdate?: (diagnostics: Partial<AdapterDiagnostics>) => void;
  onEnded?: () => void;
  onTriggerCountdown?: () => void;
}
