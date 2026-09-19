import React, { useEffect, useRef, useState, useCallback } from "react";
import { AlertCircle, RefreshCw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResolvedContent } from "@shared/universal-streaming-engine";
import { AdapterDiagnostics } from "./types";

declare global {
  interface Window {
    Vimeo?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          id: number | string;
          width?: number | string;
          height?: number | string;
          autoplay?: boolean;
          responsive?: boolean;
          controls?: boolean;
        }
      ) => any;
    };
  }
}

interface VimeoAdapterProps {
  content: ResolvedContent;
  isHost: boolean;
  canControl: boolean;
  isPlaying: boolean;
  targetPosition: number;
  onPositionUpdate: (position: number, duration?: number) => void;
  onLocalPlaybackChange: (isPlaying: boolean, position: number) => void;
  onPlayerReady?: () => void;
  onDiagnosticsUpdate?: (diag: Partial<AdapterDiagnostics>) => void;
  onEnded?: () => void;
}

export const VimeoAdapter: React.FC<VimeoAdapterProps> = ({
  content,
  isHost,
  canControl,
  isPlaying,
  targetPosition,
  onPositionUpdate,
  onLocalPlaybackChange,
  onPlayerReady,
  onDiagnosticsUpdate,
  onEnded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const programmaticActionRef = useRef(false);

  const reportDiagnostics = useCallback(
    (patch: Partial<AdapterDiagnostics>) => {
      onDiagnosticsUpdate?.({
        platform: "vimeo",
        normalizedUrl: content.normalizedUrl,
        contentId: content.contentId,
        contentType: content.contentType,
        adapterName: "VimeoAdapter",
        embedAllowed: true,
        ...patch,
      });
    },
    [content, onDiagnosticsUpdate]
  );

  const initVimeo = useCallback(() => {
    if (!content.contentId || !window.Vimeo?.Player || !containerRef.current) return;
    setError(null);
    reportDiagnostics({ playerState: "initializing", apiLoaded: true });

    try {
      containerRef.current.innerHTML = "";
      const mountNode = document.createElement("div");
      mountNode.className = "h-full w-full";
      containerRef.current.appendChild(mountNode);

      const player = new window.Vimeo.Player(mountNode, {
        id: content.contentId,
        responsive: true,
        controls: true,
        autoplay: isPlaying,
      });
      playerRef.current = player;

      player.ready().then(() => {
        setReady(true);
        onPlayerReady?.();
        reportDiagnostics({ playerState: "ready" });

        if (targetPosition > 0) {
          player.setCurrentTime(targetPosition).catch(() => {});
        }
      });

      player.on("play", (data: any) => {
        reportDiagnostics({ playerState: "playing" });
        if (!programmaticActionRef.current) {
          onLocalPlaybackChange(true, data.seconds || 0);
        }
      });

      player.on("pause", (data: any) => {
        reportDiagnostics({ playerState: "paused" });
        if (!programmaticActionRef.current) {
          onLocalPlaybackChange(false, data.seconds || 0);
        }
      });

      player.on("timeupdate", (data: any) => {
        onPositionUpdate(data.seconds, data.duration);
      });

      player.on("ended", () => {
        onEnded?.();
      });
    } catch (err: any) {
      console.error("[Vimeo Adapter] Init error:", err);
      const msg = "Unable to initialize Vimeo Player.";
      setError(msg);
      reportDiagnostics({ playerState: "error", error: msg });
    }
  }, [content.contentId, isPlaying, targetPosition, onPlayerReady, onLocalPlaybackChange, onPositionUpdate, onEnded, reportDiagnostics]);

  useEffect(() => {
    if (!window.Vimeo?.Player) {
      const existingScript = document.getElementById("vimeo-player-sdk");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "vimeo-player-sdk";
        script.src = "https://player.vimeo.com/api/player.js";
        script.async = true;
        script.onload = () => initVimeo();
        script.onerror = () => {
          const msg = "Failed to load Vimeo Player SDK.";
          setError(msg);
          reportDiagnostics({ playerState: "error", error: msg });
        };
        document.body.appendChild(script);
      } else {
        const timer = setInterval(() => {
          if (window.Vimeo?.Player) {
            clearInterval(timer);
            initVimeo();
          }
        }, 80);
        return () => clearInterval(timer);
      }
    } else {
      initVimeo();
    }

    return () => {
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
      setReady(false);
    };
  }, [content.contentId, initVimeo, reportDiagnostics]);

  // Handle Play/Pause
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    programmaticActionRef.current = true;
    try {
      if (isPlaying) {
        playerRef.current.play().catch(() => {});
      } else {
        playerRef.current.pause().catch(() => {});
      }
    } catch {}
    const timer = setTimeout(() => {
      programmaticActionRef.current = false;
    }, 450);
    return () => clearTimeout(timer);
  }, [isPlaying, ready]);

  // Handle Seek
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    try {
      playerRef.current.getCurrentTime().then((current: number) => {
        if (Math.abs(current - targetPosition) > 1.8) {
          programmaticActionRef.current = true;
          playerRef.current.setCurrentTime(targetPosition).catch(() => {});
          setTimeout(() => {
            programmaticActionRef.current = false;
          }, 500);
        }
      });
    } catch {}
  }, [targetPosition, ready]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-sky-500/20 bg-[#0c141c] p-6 text-center text-white">
        <AlertCircle size={28} className="text-sky-400" />
        <h3 className="mt-3 text-base font-bold">Vimeo Player Error</h3>
        <p className="mt-1 max-w-sm text-xs text-neutral-400">{error}</p>
        <Button
          onClick={() => initVimeo()}
          variant="outline"
          className="mt-4 border-white/10 text-xs text-white"
        >
          <RefreshCw size={14} className="mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-[9px] font-bold text-white backdrop-blur-md">
        <Video size={13} className="text-[#1AB7EA]" />
        <span>Vimeo Player</span>
        <span className="rounded bg-[#1AB7EA]/20 px-1.5 py-0.5 text-[8px] font-extrabold text-[#1AB7EA]">
          AUTOMATIC SYNC
        </span>
      </div>
    </div>
  );
};
