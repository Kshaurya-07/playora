import React from "react";
import {
  ExternalLink,
  Film,
  Play,
  Pause,
  Timer,
  CheckCircle2,
  Info,
  SquareArrowOutUpRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTimecode, PlatformInfo } from "@shared/watch-party";

interface AssistedSyncAdapterProps {
  platform: PlatformInfo;
  contentUrl: string;
  roomTitle: string;
  isHost: boolean;
  isPlaying: boolean;
  currentPosition: number;
  onTogglePlayback: () => void;
  onTriggerCountdown: () => void;
  onSeekTo?: (seconds: number) => void;
}

export const AssistedSyncAdapter: React.FC<AssistedSyncAdapterProps> = ({
  platform,
  contentUrl,
  roomTitle,
  isHost,
  isPlaying,
  currentPosition,
  onTogglePlayback,
  onTriggerCountdown,
  onSeekTo,
}) => {
  const formattedTime = formatTimecode(currentPosition);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/[.1] bg-gradient-to-b from-[#131620] to-[#0a0c12] p-6 shadow-2xl">
      {/* Platform & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.08] pb-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl font-bold shadow-lg"
            style={{ backgroundColor: platform.brandColor, color: "#fff" }}
          >
            <Film size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">{roomTitle}</h2>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                style={{
                  backgroundColor: `${platform.brandColor}22`,
                  color: platform.brandColor,
                  border: `1px solid ${platform.brandColor}44`,
                }}
              >
                {platform.name}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Assisted Sync Companion Room · Personal Account Playback
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.open(contentUrl, "_blank")}
            className="h-9 rounded-xl bg-white/[.08] px-4 text-xs font-bold text-white hover:bg-white/[.15]"
          >
            <SquareArrowOutUpRight size={14} className="mr-1.5" /> Open on {platform.name}
          </Button>
        </div>
      </div>

      {/* Central Synchronized Timecode & Master Timeline */}
      <div className="my-auto flex flex-col items-center justify-center py-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          Master Synchronized Timecode
        </div>

        <div className="mt-4 font-mono text-5xl font-black tracking-tight text-white md:text-7xl">
          {formattedTime}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-neutral-400">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isPlaying ? "bg-[#d6ff3f]" : "bg-neutral-500"
            }`}
          />
          <span>Room is currently {isPlaying ? "Playing" : "Paused"}</span>
        </div>

        {/* Play / Pause & Countdown Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={onTogglePlayback}
            className={`h-11 rounded-xl px-5 text-xs font-extrabold ${
              isPlaying
                ? "bg-amber-500 text-black hover:bg-amber-400"
                : "bg-[#d6ff3f] text-black hover:bg-[#e1ff70]"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause size={15} className="mr-2" /> Pause Room
              </>
            ) : (
              <>
                <Play size={15} className="mr-2 fill-current" /> Play Room
              </>
            )}
          </Button>

          {isHost && (
            <Button
              onClick={onTriggerCountdown}
              variant="outline"
              className="h-11 rounded-xl border-white/20 bg-white/5 px-4 text-xs font-bold text-white hover:bg-white/10"
            >
              <Timer size={15} className="mr-2 text-[#d6ff3f]" /> 3-2-1 Sync Countdown
            </Button>
          )}
        </div>
      </div>

      {/* Synchronized Companion Instructions */}
      <div className="rounded-xl border border-white/[.08] bg-black/40 p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#d6ff3f]">
          <Info size={14} />
          <span>How Assisted Sync Works</span>
        </div>
        <div className="mt-3 grid gap-3 text-xs text-neutral-300 sm:grid-cols-3">
          <div className="rounded-lg border border-white/5 bg-white/[.02] p-2.5">
            <span className="font-mono text-[10px] font-bold text-[#d6ff3f]">STEP 01</span>
            <p className="mt-1">
              Open the title on {platform.name} using your own active subscription.
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[.02] p-2.5">
            <span className="font-mono text-[10px] font-bold text-[#d6ff3f]">STEP 02</span>
            <p className="mt-1">
              Pause your player at <strong className="text-white">{formattedTime}</strong> on your device.
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[.02] p-2.5">
            <span className="font-mono text-[10px] font-bold text-[#d6ff3f]">STEP 03</span>
            <p className="mt-1">
              When the host starts the 3-2-1 countdown, press Play right at 1 to stay perfectly aligned!
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-[10px] text-neutral-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-[#d6ff3f]" />
            DRM-safe social layer: We never mirror, proxy, or bypass streaming subscriptions.
          </span>
          <span>Voice & Chat are live</span>
        </div>
      </div>
    </div>
  );
};
