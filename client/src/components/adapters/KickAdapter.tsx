import React, { useEffect } from "react";
import { ExternalLink, Radio, Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResolvedContent } from "@shared/universal-streaming-engine";
import { AdapterDiagnostics } from "./types";

interface KickAdapterProps {
  content: ResolvedContent;
  isHost: boolean;
  isPlaying: boolean;
  onTriggerCountdown?: () => void;
  onDiagnosticsUpdate?: (diag: Partial<AdapterDiagnostics>) => void;
}

export const KickAdapter: React.FC<KickAdapterProps> = ({
  content,
  isHost,
  isPlaying,
  onTriggerCountdown,
  onDiagnosticsUpdate,
}) => {
  const channel = content.contentId;
  const kickEmbedUrl = `https://player.kick.com/${channel}?autoplay=true&muted=false`;
  const streamUrl = content.normalizedUrl || `https://kick.com/${channel}`;

  useEffect(() => {
    onDiagnosticsUpdate?.({
      platform: "kick",
      normalizedUrl: streamUrl,
      contentId: channel,
      contentType: "live",
      adapterName: "KickAdapter",
      embedAllowed: true,
      playerState: "ready",
      apiLoaded: true,
    });
  }, [channel, streamUrl, onDiagnosticsUpdate]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-[#0b0f0b]">
      {/* Player Embed Surface */}
      <div className="relative flex-1 bg-black">
        <iframe
          src={kickEmbedUrl}
          title={`Kick Stream - ${channel}`}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />

        {/* Top Badges */}
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-[9px] font-bold text-white backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#53FC18] animate-pulse" />
            <span>Kick · {channel}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-[#ffba5d]/30 bg-[#ffba5d]/10 px-2.5 py-1.5 text-[9px] font-bold text-[#ffba5d] backdrop-blur-md">
            <Zap size={12} />
            <span>Assisted Sync Mode</span>
          </div>
        </div>
      </div>

      {/* Assisted Sync Banner & Live Tools */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.08] bg-[#111613] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#53FC18]/10 text-[#53FC18]">
            <Radio size={16} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white">Live Stream Synchronization</p>
            <p className="text-[10px] text-neutral-400">
              Kick embeds do not permit programmatic seek. Coordinate stream timing with your party.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isHost && onTriggerCountdown && (
            <Button
              onClick={onTriggerCountdown}
              className="h-8 rounded-lg bg-[#53FC18] px-3 text-[10px] font-extrabold text-black hover:bg-[#43d412]"
            >
              <Timer size={13} className="mr-1.5" /> 3-2-1 Countdown
            </Button>
          )}

          <Button
            onClick={() => window.open(streamUrl, "_blank")}
            variant="outline"
            className="h-8 rounded-lg border-white/10 bg-white/5 px-3 text-[10px] font-bold text-neutral-300 hover:bg-white/10 hover:text-white"
          >
            <ExternalLink size={13} className="mr-1.5" /> Open in Kick
          </Button>
        </div>
      </div>
    </div>
  );
};
