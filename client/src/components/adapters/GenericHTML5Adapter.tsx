import React, { useEffect, useRef, useState, useCallback } from "react";
import { AlertCircle, FileVideo, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResolvedContent } from "@shared/universal-streaming-engine";
import { AdapterDiagnostics } from "./types";

interface GenericHTML5AdapterProps {
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

export const GenericHTML5Adapter: React.FC<GenericHTML5AdapterProps> = ({
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const programmaticActionRef = useRef(false);

  const reportDiagnostics = useCallback(
    (patch: Partial<AdapterDiagnostics>) => {
      onDiagnosticsUpdate?.({
        platform: "html5",
        normalizedUrl: content.normalizedUrl,
        contentId: content.contentId,
        contentType: content.contentType,
        adapterName: "GenericHTML5Adapter",
        embedAllowed: true,
        ...patch,
      });
    },
    [content, onDiagnosticsUpdate]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    reportDiagnostics({ playerState: "initializing", apiLoaded: true });

    const handleLoadedMetadata = () => {
      setReady(true);
      onPlayerReady?.();
      reportDiagnostics({ playerState: "ready" });
      if (targetPosition > 0) {
        video.currentTime = targetPosition;
      }
      if (isPlaying) {
        video.play().catch(() => {});
      }
    };

    const handlePlay = () => {
      reportDiagnostics({ playerState: "playing" });
      if (!programmaticActionRef.current) {
        onLocalPlaybackChange(true, video.currentTime);
      }
    };

    const handlePause = () => {
      reportDiagnostics({ playerState: "paused" });
      if (!programmaticActionRef.current) {
        onLocalPlaybackChange(false, video.currentTime);
      }
    };

    const handleTimeUpdate = () => {
      onPositionUpdate(video.currentTime, video.duration || 0);
    };

    const handleError = () => {
      const msg = "Failed to load direct video stream. Check format (MP4/WebM) or CORS headers.";
      setError(msg);
      reportDiagnostics({ playerState: "error", error: msg });
    };

    const handleEnded = () => {
      onEnded?.();
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("error", handleError);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("error", handleError);
      video.removeEventListener("ended", handleEnded);
    };
  }, [content.normalizedUrl, onPlayerReady, onLocalPlaybackChange, onPositionUpdate, onEnded, reportDiagnostics]);

  // Handle Play/Pause synchronization
  useEffect(() => {
    const video = videoRef.current;
    if (!ready || !video) return;

    programmaticActionRef.current = true;
    try {
      if (isPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    } catch {}

    const timer = setTimeout(() => {
      programmaticActionRef.current = false;
    }, 450);
    return () => clearTimeout(timer);
  }, [isPlaying, ready]);

  // Handle Seek synchronization
  useEffect(() => {
    const video = videoRef.current;
    if (!ready || !video) return;

    const drift = Math.abs(video.currentTime - targetPosition);
    if (drift > 1.8) {
      programmaticActionRef.current = true;
      video.currentTime = targetPosition;
      setTimeout(() => {
        programmaticActionRef.current = false;
      }, 500);
    }
  }, [targetPosition, ready]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-cyan-500/20 bg-[#0a1215] p-6 text-center text-white">
        <AlertCircle size={28} className="text-cyan-400" />
        <h3 className="mt-3 text-base font-bold">Video Stream Error</h3>
        <p className="mt-1 max-w-sm text-xs text-neutral-400">{error}</p>
        <Button
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.load();
            }
          }}
          variant="outline"
          className="mt-4 border-white/10 text-xs text-white"
        >
          <RefreshCw size={14} className="mr-1.5" /> Reload Stream
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        src={content.normalizedUrl}
        controls
        playsInline
        className="h-full w-full object-contain"
      />
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-[9px] font-bold text-white backdrop-blur-md">
        <FileVideo size={13} className="text-[#00E5FF]" />
        <span>Direct Video Stream</span>
        <span className="rounded bg-[#00E5FF]/20 px-1.5 py-0.5 text-[8px] font-extrabold text-[#00E5FF]">
          AUTOMATIC SYNC
        </span>
      </div>
    </div>
  );
};
