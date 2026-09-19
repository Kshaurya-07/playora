import React, { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Maximize2,
  Minimize2,
  Radio,
  RefreshCw,
  Volume2,
  VolumeX,
  Youtube,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResolvedContent } from "@shared/universal-streaming-engine";
import { AdapterDiagnostics } from "./types";

export interface YouTubePlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
  getAvailablePlaybackRates: () => number[];
  loadVideoById: (args: string | { videoId: string; startSeconds?: number }) => void;
  cueVideoById: (args: string | { videoId: string; startSeconds?: number }) => void;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          playerVars?: Record<string, any>;
          events?: {
            onReady?: (event: any) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YouTubePlayerInstance;
      PlayerState?: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubeAdapterProps {
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

export const YouTubeAdapter: React.FC<YouTubeAdapterProps> = ({
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
  const videoId = content.contentId;
  const isLive = content.isLive;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const programmaticActionRef = useRef(false);
  const currentVideoIdRef = useRef<string | null>(null);
  const lastTargetPosRef = useRef(targetPosition);
  const lastIsPlayingRef = useRef(isPlaying);

  const reportDiagnostics = useCallback(
    (patch: Partial<AdapterDiagnostics>) => {
      onDiagnosticsUpdate?.({
        platform: "youtube",
        normalizedUrl: content.normalizedUrl,
        contentId: videoId,
        contentType: content.contentType,
        adapterName: isLive ? "YouTubeLiveAdapter" : "YouTubeAdapter",
        embedAllowed: true,
        ...patch,
      });
    },
    [content, videoId, isLive, onDiagnosticsUpdate]
  );

  // Mount/Initialize the YouTube player safely
  const mountPlayer = useCallback(() => {
    if (!videoId || !window.YT?.Player || !wrapperRef.current) return;
    setError(null);
    reportDiagnostics({ playerState: "initializing", apiLoaded: true });

    try {
      // Create a fresh inner mount container so calling destroy() never wipes React's wrapper
      wrapperRef.current.innerHTML = "";
      const mountNode = document.createElement("div");
      mountNode.className = "h-full w-full";
      wrapperRef.current.appendChild(mountNode);

      currentVideoIdRef.current = videoId;

      playerRef.current = new window.YT.Player(mountNode, {
        videoId,
        playerVars: {
          autoplay: isPlaying ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          start: content.initialTimecode ? Math.floor(content.initialTimecode) : 0,
        },
        events: {
          onReady: () => {
            setReady(true);
            onPlayerReady?.();
            reportDiagnostics({ playerState: "ready" });

            if (targetPosition > 0 && !isLive) {
              playerRef.current?.seekTo(targetPosition, true);
            }
            if (isPlaying) {
              playerRef.current?.playVideo();
            }
          },
          onStateChange: (event) => {
            const state = event.data;
            const currentPos = playerRef.current?.getCurrentTime() ?? 0;
            const duration = playerRef.current?.getDuration() ?? 0;

            if (state === 1) {
              // Playing
              reportDiagnostics({ playerState: "playing" });
              if (!programmaticActionRef.current) {
                onLocalPlaybackChange(true, currentPos);
              }
            } else if (state === 2) {
              // Paused
              reportDiagnostics({ playerState: "paused" });
              if (!programmaticActionRef.current) {
                onLocalPlaybackChange(false, currentPos);
              }
            } else if (state === 3) {
              // Buffering
              reportDiagnostics({ playerState: "buffering" });
            } else if (state === 0) {
              // Ended
              onEnded?.();
            }

            if (duration > 0) {
              onPositionUpdate(currentPos, duration);
            }
          },
          onError: (event) => {
            console.error("[YouTube Adapter] Error code:", event.data);
            let message = "Unable to connect to YouTube player.";
            if (event.data === 101 || event.data === 150) {
              message = "The video owner has restricted embedded playback on external sites.";
            } else if (event.data === 2) {
              message = "Invalid YouTube video ID or corrupted URL.";
            } else if (event.data === 5) {
              message = "HTML5 playback error. Please retry or refresh.";
            }
            setError(message);
            reportDiagnostics({ playerState: "error", error: message });
          },
        },
      });
    } catch (err: any) {
      console.error("[YouTube Adapter] Mount exception:", err);
      const msg = err?.message || "Failed to initialize YouTube IFrame Player.";
      setError(msg);
      reportDiagnostics({ playerState: "error", error: msg });
    }
  }, [videoId, isPlaying, isLive, content.initialTimecode, onPlayerReady, onLocalPlaybackChange, onEnded, onPositionUpdate, reportDiagnostics, targetPosition]);

  // Load YouTube IFrame API Script if not already present
  useEffect(() => {
    if (!window.YT?.Player) {
      const existingScript = document.getElementById("yt-iframe-api-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "yt-iframe-api-script";
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        window.onYouTubeIframeAPIReady = () => mountPlayer();
        document.body.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if (window.YT?.Player) {
            clearInterval(checkInterval);
            mountPlayer();
          }
        }, 80);
        return () => clearInterval(checkInterval);
      }
    } else {
      // If videoId changed and player already exists, load video directly
      if (playerRef.current && currentVideoIdRef.current !== videoId) {
        currentVideoIdRef.current = videoId;
        try {
          if (isPlaying) {
            playerRef.current.loadVideoById(videoId);
          } else {
            playerRef.current.cueVideoById(videoId);
          }
          return;
        } catch {}
      }
      mountPlayer();
    }

    return () => {
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
      setReady(false);
    };
  }, [videoId]); // Only run when videoId changes, NOT on position/tick updates!

  // Synchronize incoming Play / Pause state
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    if (isPlaying === lastIsPlayingRef.current) return;
    lastIsPlayingRef.current = isPlaying;

    programmaticActionRef.current = true;
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {}

    const timer = setTimeout(() => {
      programmaticActionRef.current = false;
    }, 450);
    return () => clearTimeout(timer);
  }, [isPlaying, ready]);

  // Synchronize incoming Seek / Target Position
  useEffect(() => {
    if (!ready || !playerRef.current || isLive) return;
    const diff = Math.abs(targetPosition - lastTargetPosRef.current);
    if (diff < 0.5) return;
    lastTargetPosRef.current = targetPosition;

    try {
      const current = playerRef.current.getCurrentTime() || 0;
      const drift = Math.abs(current - targetPosition);
      if (drift > 1.8) {
        programmaticActionRef.current = true;
        playerRef.current.seekTo(targetPosition, true);
        setTimeout(() => {
          programmaticActionRef.current = false;
        }, 500);
      }
    } catch {}
  }, [targetPosition, ready, isLive]);

  // Periodic Position Reporter for Drift Engine
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    const interval = setInterval(() => {
      try {
        const pos = playerRef.current?.getCurrentTime();
        const dur = playerRef.current?.getDuration();
        if (typeof pos === "number" && !isNaN(pos)) {
          onPositionUpdate(pos, dur);
        }
      } catch {}
    }, 500);

    return () => clearInterval(interval);
  }, [ready, onPositionUpdate]);

  // Volume & Mute Controls
  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (!playerRef.current) return;
    try {
      playerRef.current.setPlaybackRate(rate);
      setPlaybackRate(rate);
      toast.success(`Speed set to ${rate}x`);
    } catch {}
  };

  // Sync to Live Head
  const syncToLiveEdge = () => {
    if (!playerRef.current || !isLive) return;
    try {
      const dur = playerRef.current.getDuration();
      if (dur > 0) {
        playerRef.current.seekTo(dur, true);
        playerRef.current.playVideo();
        toast.success("Synchronized to Live Edge");
      }
    } catch {}
  };

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-black/85 p-6 text-center text-white backdrop-blur-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <AlertCircle size={26} />
        </div>
        <h3 className="mt-3 text-base font-extrabold text-white">YouTube Connection Issue</h3>
        <p className="mt-1.5 max-w-sm text-xs text-neutral-400">{error}</p>
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => mountPlayer()}
            className="h-9 rounded-xl bg-white/10 px-4 text-xs font-bold text-white hover:bg-white/20"
          >
            <RefreshCw size={14} className="mr-1.5" /> Retry Connection
          </Button>
          <Button
            onClick={() => window.open(content.rawUrl, "_blank")}
            variant="outline"
            className="h-9 rounded-xl border-white/10 text-xs text-neutral-300"
          >
            Open on YouTube
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative h-full w-full overflow-hidden rounded-2xl bg-black">
      {/* Persistent DOM mount for YouTube iframe */}
      <div ref={wrapperRef} className="h-full w-full" />

      {/* Top Left Live / Video Badge */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-[9px] font-bold text-white backdrop-blur-md">
          <Youtube size={14} className="text-[#ff3b3b]" />
          <span>YouTube {isLive ? "Live Stream" : "Video"}</span>
        </div>

        {isLive && (
          <span className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-[9px] font-extrabold text-red-400 backdrop-blur-md">
            <Radio size={12} className="animate-pulse" /> 🔴 LIVE
          </span>
        )}
      </div>

      {/* Top Right Quick Controls (Fullscreen, Speed, Live Sync) */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        {isLive && (
          <button
            onClick={syncToLiveEdge}
            className="btn-press flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/20 px-2 py-1 text-[10px] font-bold text-red-300 backdrop-blur-md hover:bg-red-500/30"
            title="Sync to Live Head"
          >
            <Zap size={11} /> Sync to Live
          </button>
        )}

        {!isLive && (
          <div className="flex items-center rounded-lg border border-white/10 bg-black/60 p-0.5 text-[9px] font-bold text-neutral-300 backdrop-blur-md">
            {[1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => changePlaybackRate(rate)}
                className={`rounded px-1.5 py-0.5 transition ${
                  playbackRate === rate ? "bg-[#d6ff3f] text-black font-extrabold" : "hover:text-white"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        )}

        <button
          onClick={toggleMute}
          className="btn-press flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-white backdrop-blur-md hover:bg-white/10"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>

        <button
          onClick={toggleFullscreen}
          className="btn-press flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-white backdrop-blur-md hover:bg-white/10"
          title="Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
    </div>
  );
};
