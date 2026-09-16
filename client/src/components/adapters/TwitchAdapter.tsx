import React, { useEffect, useRef, useState, useCallback } from "react";
import { Radio, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Twitch?: {
      Embed: {
        new (
          elementId: string,
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
  target: { type: "channel" | "video"; id: string };
  isHost: boolean;
  canControl: boolean;
  isPlaying: boolean;
  targetPosition: number;
  onPositionUpdate: (position: number) => void;
  onLocalPlaybackChange: (isPlaying: boolean, position: number) => void;
  onPlayerReady?: () => void;
}

export const TwitchAdapter: React.FC<TwitchAdapterProps> = ({
  target,
  isHost,
  canControl,
  isPlaying,
  targetPosition,
  onPositionUpdate,
  onLocalPlaybackChange,
  onPlayerReady,
}) => {
  const embedRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const programmaticActionRef = useRef(false);

  const initTwitch = useCallback(() => {
    if (!target.id || !window.Twitch?.Embed) return;
    setError(null);

    try {
      const container = document.getElementById("playora-twitch-mount");
      if (container) container.innerHTML = "";

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

      if (target.type === "channel") {
        options.channel = target.id;
      } else {
        options.video = target.id;
      }

      const TwitchSDK = window.Twitch;
      if (!TwitchSDK?.Embed) return;

      const embed = new TwitchSDK.Embed("playora-twitch-mount", options);
      embedRef.current = embed;

      embed.addEventListener(TwitchSDK.Embed.VIDEO_READY, () => {
        const player = embed.getPlayer();
        playerRef.current = player;
        setReady(true);
        onPlayerReady?.();

        player.addEventListener(TwitchSDK.Embed.VIDEO_PLAY, () => {
          if (programmaticActionRef.current) return;
          const pos = player.getCurrentTime() || 0;
          onLocalPlaybackChange(true, pos);
        });

        player.addEventListener(TwitchSDK.Embed.VIDEO_PAUSE, () => {
          if (programmaticActionRef.current) return;
          const pos = player.getCurrentTime() || 0;
          onLocalPlaybackChange(false, pos);
        });
      });
    } catch (err) {
      console.error("[Twitch Adapter] Init error:", err);
      setError("Unable to initialize Twitch Interactive Player. Falling back to Assisted Sync.");
    }
  }, [target, onLocalPlaybackChange, onPlayerReady]);

  useEffect(() => {
    if (!window.Twitch?.Embed) {
      const scriptTag = document.getElementById("twitch-embed-script");
      if (!scriptTag) {
        const script = document.createElement("script");
        script.id = "twitch-embed-script";
        script.src = "https://embed.twitch.tv/v2/embed.js";
        script.async = true;
        script.onload = () => initTwitch();
        script.onerror = () => setError("Failed to load Twitch Embed SDK.");
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
  }, [target, initTwitch]);

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
    }, 400);
    return () => clearTimeout(timer);
  }, [isPlaying, ready]);

  // Periodic position update for VODs
  useEffect(() => {
    if (!ready || !playerRef.current || target.type === "channel") return;
    const interval = setInterval(() => {
      try {
        const pos = playerRef.current.getCurrentTime();
        if (typeof pos === "number") onPositionUpdate(pos);
      } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, [ready, target.type, onPositionUpdate]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-purple-500/20 bg-[#120F1D] p-6 text-center text-white">
        <Radio size={28} className="text-[#9146FF]" />
        <h3 className="mt-3 text-base font-bold">Twitch Embed Restriction</h3>
        <p className="mt-1 max-w-sm text-xs text-neutral-400">
          Twitch requires domain verification for embeds or this channel is in live mode. Use the link below to watch directly with Assisted Sync.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => window.open(`https://twitch.tv/${target.id}`, "_blank")}
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
      <div id="playora-twitch-mount" className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-[9px] font-bold text-white/90 backdrop-blur-md">
        <Radio size={13} className="text-[#9146FF]" />
        <span>Twitch {target.type === "channel" ? "Live Stream" : "VOD"}</span>
        <span className="rounded bg-[#9146FF]/20 px-1.5 py-0.5 text-[8px] font-extrabold text-[#9146FF]">
          AUTOMATIC SYNC
        </span>
      </div>
    </div>
  );
};
