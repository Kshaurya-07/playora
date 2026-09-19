import React, { useEffect, useRef, useState, useCallback } from "react";
import { Radio, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResolvedContent } from "@shared/universal-streaming-engine";
import { AdapterDiagnostics } from "./types";

declare global {
  interface Window {
    Twitch?: {
      Embed: {
        new (
          elementId: string | HTMLElement,
          options: {
            width: string | number;
            height: string | number;
            channel?: string;
            video?: string;
            layout?: "video-with-chat" | "video";
            theme?: "dark" | "light";
            parent: string[];
            autoplay?: boolean;
            muted?: boolean;
          }
        ): any;
        VIDEO_READY: string;
        VIDEO_PLAY: string;
        VIDEO_PAUSE: string;
        ONLINE: string;
        OFFLINE: string;
      };
      Player?: any;
    };
  }
}

interface TwitchAdapterProps {
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

export const TwitchAdapter: React.FC<TwitchAdapterProps> = ({
  content,
  isHost,
  canControl,
  isPlaying,
  targetPosition,
  onPositionUpdate,
  onLocalPlaybackChange,
  onPlayerReady,
  onDiagnosticsUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const programmaticActionRef = useRef(false);

  const reportDiagnostics = useCallback(
    (patch: Partial<AdapterDiagnostics>) => {
      onDiagnosticsUpdate?.({
        platform: "twitch",
        normalizedUrl: content.normalizedUrl,
        contentId: content.contentId,
        contentType: content.contentType,
        adapterName: content.contentType === "vod" ? "TwitchVODAdapter" : "TwitchLiveAdapter",
        embedAllowed: true,
        ...patch,
      });
    },
    [content, onDiagnosticsUpdate]
  );

  const initTwitch = useCallback(() => {
    if (!content.contentId || !window.Twitch?.Embed || !containerRef.current) return;
    setError(null);
    reportDiagnostics({ playerState: "initializing", apiLoaded: true });

    try {
      containerRef.current.innerHTML = "";
      const mountDiv = document.createElement("div");
      mountDiv.id = "playora-twitch-inner-mount";
      mountDiv.className = "h-full w-full";
      containerRef.current.appendChild(mountDiv);

      const currentHostname = window.location.hostname || "localhost";
      const parents = [currentHostname];
      if (currentHostname !== "localhost" && !parents.includes("localhost")) {
        parents.push("localhost");
      }

      const options: any = {
        width: "100%",
        height: "100%",
        layout: "video",
        theme: "dark",
        parent: parents,
        autoplay: true,
        muted: false,
      };

      if (content.contentType === "vod") {
        options.video = content.contentId;
      } else {
        options.channel = content.contentId;
      }

      const TwitchSDK = window.Twitch;
      if (!TwitchSDK?.Embed) return;

      const embed = new TwitchSDK.Embed("playora-twitch-inner-mount", options);
      embedRef.current = embed;

      embed.addEventListener(TwitchSDK.Embed.VIDEO_READY, () => {
        const player = embed.getPlayer();
        playerRef.current = player;
        setReady(true);
        onPlayerReady?.();
        reportDiagnostics({ playerState: "ready" });

        player.addEventListener(TwitchSDK.Embed.VIDEO_PLAY, () => {
          reportDiagnostics({ playerState: "playing" });
          if (!programmaticActionRef.current) {
            const pos = player.getCurrentTime() || 0;
            onLocalPlaybackChange(true, pos);
          }
        });

        player.addEventListener(TwitchSDK.Embed.VIDEO_PAUSE, () => {
          reportDiagnostics({ playerState: "paused" });
          if (!programmaticActionRef.current) {
            const pos = player.getCurrentTime() || 0;
            onLocalPlaybackChange(false, pos);
          }
        });
      });
    } catch (err: any) {
      console.error("[Twitch Adapter] Init error:", err);
      const msg = "Unable to initialize Twitch Interactive Player.";
      setError(msg);
      reportDiagnostics({ playerState: "error", error: msg });
    }
  }, [content.contentId, content.contentType, onLocalPlaybackChange, onPlayerReady, reportDiagnostics]);

  useEffect(() => {
    if (!window.Twitch?.Embed) {
      const scriptTag = document.getElementById("twitch-embed-script");
      if (!scriptTag) {
        const script = document.createElement("script");
        script.id = "twitch-embed-script";
        script.src = "https://embed.twitch.tv/v2/embed.js";
        script.async = true;
        script.onload = () => initTwitch();
        script.onerror = () => {
          const msg = "Failed to load Twitch Embed SDK.";
          setError(msg);
          reportDiagnostics({ playerState: "error", error: msg });
        };
        document.body.appendChild(script);
      } else {
        const timer = setInterval(() => {
          if (window.Twitch?.Embed) {
            clearInterval(timer);
            initTwitch();
          }
        }, 100);
        return () => clearInterval(timer);
      }
    } else {
      initTwitch();
    }

    return () => {
      embedRef.current = null;
      playerRef.current = null;
      setReady(false);
    };
  }, [content.contentId, initTwitch, reportDiagnostics]);

  // Handle Play/Pause sync
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    try {
      programmaticActionRef.current = true;
      if (isPlaying) {
        playerRef.current.play();
      } else {
        playerRef.current.pause();
      }
    } catch {}
    const timer = setTimeout(() => {
      programmaticActionRef.current = false;
    }, 450);
    return () => clearTimeout(timer);
  }, [isPlaying, ready]);

  // Periodic position update for VODs
  useEffect(() => {
    if (!ready || !playerRef.current || content.contentType !== "vod") return;
    const interval = setInterval(() => {
      try {
        const pos = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        if (typeof pos === "number") onPositionUpdate(pos, dur);
      } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, [ready, content.contentType, onPositionUpdate]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-purple-500/20 bg-[#120F1D] p-6 text-center text-white">
        <Radio size={28} className="text-[#9146FF]" />
        <h3 className="mt-3 text-base font-bold">Twitch Embed Notice</h3>
        <p className="mt-1 max-w-sm text-xs text-neutral-400">
          Twitch enforces parental domain security for embedded players. You can watch directly or retry.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => window.open(content.rawUrl, "_blank")}
            className="bg-[#9146FF] text-xs font-bold text-white hover:bg-[#772CE8]"
          >
            <ExternalLink size={14} className="mr-1.5" /> Open on Twitch
          </Button>
          <Button
            onClick={() => initTwitch()}
            variant="outline"
            className="border-white/10 text-xs text-white"
          >
            <RefreshCw size={14} className="mr-1.5" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[#09080e]">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-[9px] font-bold text-white/90 backdrop-blur-md">
        <Radio size={13} className="text-[#9146FF]" />
        <span>Twitch {content.contentType === "vod" ? "VOD" : "Live Stream"}</span>
        <span className="rounded bg-[#9146FF]/20 px-1.5 py-0.5 text-[8px] font-extrabold text-[#9146FF]">
          AUTOMATIC SYNC
        </span>
      </div>
    </div>
  );
};
