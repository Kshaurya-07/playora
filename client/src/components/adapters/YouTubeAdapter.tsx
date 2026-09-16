import React, { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { AlertCircle, RefreshCw, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  videoId: string;
  isLive?: boolean;
  isHost: boolean;
  canControl: boolean;
  isPlaying: boolean;
  targetPosition: number;
  onPositionUpdate: (position: number) => void;
  onLocalPlaybackChange: (isPlaying: boolean, position: number) => void;
  onPlayerReady?: () => void;
}

export const YouTubeAdapter: React.FC<YouTubeAdapterProps> = ({
  videoId,
  isLive = false,
  isHost,
  canControl,
  isPlaying,
  targetPosition,
  onPositionUpdate,
  onLocalPlaybackChange,
  onPlayerReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const programmaticActionRef = useRef(false);
  const lastTargetPosRef = useRef(targetPosition);
  const lastIsPlayingRef = useRef(isPlaying);

  // Initialize official YouTube IFrame Player
  const initPlayer = useCallback(() => {
    if (!videoId || !window.YT?.Player) return;
    setError(null);

    try {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player("playora-youtube-mount", {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            setReady(true);
            onPlayerReady?.();
            if (targetPosition > 0) {
              playerRef.current?.seekTo(targetPosition, true);
            }
            if (isPlaying) {
              playerRef.current?.playVideo();
            }
          },
          onStateChange: (event) => {
            if (programmaticActionRef.current) return;
            const state = event.data;
            const currentPos = playerRef.current?.getCurrentTime() ?? 0;

            if (state === 1) {
              // Playing
              onLocalPlaybackChange(true, currentPos);
            } else if (state === 2) {
              // Paused
              onLocalPlaybackChange(false, currentPos);
            }
          },
          onError: (event) => {
            console.error("[YouTube Adapter] Player Error:", event.data);
            if (event.data === 101 || event.data === 150) {
              setError("The video owner does not allow embedded playback on other sites.");
            } else {
              setError("Unable to connect to YouTube player. Check video URL or retry.");
            }
          },
        },
      });
    } catch (err) {
      console.error("[YouTube Adapter] Mount error:", err);
      setError("Failed to initialize YouTube IFrame Player.");
    }
  }, [videoId, onLocalPlaybackChange, onPlayerReady, targetPosition, isPlaying]);

  useEffect(() => {
    if (!window.YT?.Player) {
      const scriptTag = document.getElementById("yt-iframe-api-script");
      if (!scriptTag) {
        const script = document.createElement("script");
        script.id = "yt-iframe-api-script";
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        window.onYouTubeIframeAPIReady = () => initPlayer();
        document.body.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if (window.YT?.Player) {
            clearInterval(checkInterval);
            initPlayer();
          }
        }, 100);
        return () => clearInterval(checkInterval);
      }
    } else {
      initPlayer();
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
      setReady(false);
    };
  }, [videoId, initPlayer]);

  // Synchronize incoming room playback state (Play/Pause)
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
    }, 400);
    return () => clearTimeout(timer);
  }, [isPlaying, ready]);

  // Synchronize incoming seek / target position
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    const diff = Math.abs(targetPosition - lastTargetPosRef.current);
    if (diff < 0.5) return;
    lastTargetPosRef.current = targetPosition;

    const current = playerRef.current.getCurrentTime() || 0;
    const drift = Math.abs(current - targetPosition);
    if (drift > 1.5) {
      programmaticActionRef.current = true;
      playerRef.current.seekTo(targetPosition, true);
      setTimeout(() => {
        programmaticActionRef.current = false;
      }, 500);
    }
  }, [targetPosition, ready]);

  // Periodic position reporter for drift calculations
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    const interval = setInterval(() => {
      try {
        const pos = playerRef.current?.getCurrentTime();
        if (typeof pos === "number" && !isNaN(pos)) {
          onPositionUpdate(pos);
        }
      } catch {}
    }, 500);

    return () => clearInterval(interval);
  }, [ready, onPositionUpdate]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-black/80 p-6 text-center text-white backdrop-blur-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <AlertCircle size={24} />
        </div>
        <h3 className="mt-3 text-base font-bold text-white">YouTube Playback Error</h3>
        <p className="mt-1 max-w-sm text-xs text-neutral-400">{error}</p>
        <Button
          onClick={() => initPlayer()}
          variant="outline"
          className="mt-4 border-white/20 bg-white/10 text-xs font-bold text-white hover:bg-white/20"
        >
          <RefreshCw size={14} className="mr-1.5" /> Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-2xl bg-black">
      <div id="playora-youtube-mount" className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-[9px] font-bold text-white/90 backdrop-blur-md">
        <Youtube size={14} className="text-[#ff4d4d]" />
        <span>Official YouTube Player</span>
        {isLive && (
          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[8px] font-extrabold text-red-400">
            ● LIVE STREAM
          </span>
        )}
      </div>
    </div>
  );
};
