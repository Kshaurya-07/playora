import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Copy, Activity, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ResolvedContent, DriftStatus } from "@shared/universal-streaming-engine";
import { AdapterDiagnostics } from "./adapters/types";

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: AdapterDiagnostics | null;
  content: ResolvedContent | null;
  latencyMs: number;
  clockOffset: number;
  localDrift: number;
  driftStatus: DriftStatus;
  connected: boolean;
  voiceConnected: boolean;
  voicePeerCount: number;
  onForceResync?: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  diagnostics,
  content,
  latencyMs,
  clockOffset,
  localDrift,
  driftStatus,
  connected,
  voiceConnected,
  voicePeerCount,
  onForceResync,
}) => {
  const getStatusIcon = (status: "good" | "warn" | "error") => {
    if (status === "good") return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
    if (status === "warn") return <AlertTriangle size={16} className="text-amber-400 shrink-0" />;
    return <XCircle size={16} className="text-red-400 shrink-0" />;
  };

  const copyDiagnosticReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      websocket: {
        connected,
        latencyMs,
        clockOffsetMs: clockOffset,
      },
      playback: {
        driftSeconds: Number(localDrift.toFixed(3)),
        driftStatus,
        playerState: diagnostics?.playerState || "unknown",
        adapter: diagnostics?.adapterName || "AssistedSync",
      },
      content: content ? {
        platform: content.platform,
        platformName: content.platformName,
        contentId: content.contentId,
        contentType: content.contentType,
        isLive: content.isLive,
        syncCapability: content.capabilities.syncCapability,
        normalizedUrl: content.normalizedUrl,
      } : null,
      voiceChat: {
        connected: voiceConnected,
        activePeers: voicePeerCount,
      },
      userAgent: navigator.userAgent,
    };

    navigator.clipboard?.writeText(JSON.stringify(report, null, 2));
    toast.success("Diagnostics report copied to clipboard!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-white/10 bg-[#0d1017] p-6 text-white sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6ff3f]/10 text-[#d6ff3f]">
              <Activity size={18} />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-white">
                Connection & Stream Diagnostics
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Real-time telemetry and synchronization health
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {/* WebSocket Server Connection */}
          <div className="flex items-center justify-between rounded-xl border border-white/[.08] bg-white/[.02] p-3">
            <div className="flex items-center gap-2.5">
              {getStatusIcon(connected ? (latencyMs < 100 ? "good" : "warn") : "error")}
              <div>
                <p className="text-xs font-bold text-white">WebSocket Real-Time Relay</p>
                <p className="text-[11px] text-neutral-400">
                  {connected ? `Connected • RTT: ${latencyMs}ms` : "Disconnected / Reconnecting"}
                </p>
              </div>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold ${
                connected ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              }`}
            >
              {connected ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          {/* Platform Engine */}
          <div className="flex items-center justify-between rounded-xl border border-white/[.08] bg-white/[.02] p-3">
            <div className="flex items-center gap-2.5">
              {getStatusIcon(content ? "good" : "warn")}
              <div>
                <p className="text-xs font-bold text-white">Streaming Platform</p>
                <p className="text-[11px] text-neutral-400">
                  {content ? `${content.platformName} (${content.contentType.toUpperCase()})` : "Detecting stream..."}
                </p>
              </div>
            </div>
            <span className="rounded-md bg-[#d6ff3f]/10 px-2 py-0.5 text-[10px] font-bold text-[#d6ff3f]">
              {content?.capabilities.syncCapability === "automatic" ? "Auto-Sync" : "Companion"}
            </span>
          </div>

          {/* Player Lifecycle */}
          <div className="flex items-center justify-between rounded-xl border border-white/[.08] bg-white/[.02] p-3">
            <div className="flex items-center gap-2.5">
              {getStatusIcon(
                diagnostics?.playerState === "error"
                  ? "error"
                  : diagnostics?.playerState === "buffering"
                  ? "warn"
                  : "good"
              )}
              <div>
                <p className="text-xs font-bold text-white">Player Adapter</p>
                <p className="text-[11px] text-neutral-400">
                  {diagnostics?.adapterName || "Universal Engine"} • State:{" "}
                  <span className="capitalize text-white">{diagnostics?.playerState || "Ready"}</span>
                </p>
              </div>
            </div>
            <span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-mono text-neutral-300">
              {diagnostics?.contentId || content?.contentId || "N/A"}
            </span>
          </div>

          {/* Video Timeline Drift */}
          <div className="flex items-center justify-between rounded-xl border border-white/[.08] bg-white/[.02] p-3">
            <div className="flex items-center gap-2.5">
              {getStatusIcon(
                driftStatus === "synced" ? "good" : driftStatus === "slight-drift" ? "warn" : "error"
              )}
              <div>
                <p className="text-xs font-bold text-white">Clock Synchronization</p>
                <p className="text-[11px] text-neutral-400">
                  Drift:{" "}
                  <span className="font-mono font-bold text-white">
                    {localDrift > 0 ? `+${localDrift.toFixed(2)}s` : `${localDrift.toFixed(2)}s`}
                  </span>{" "}
                  • Offset: {clockOffset}ms
                </p>
              </div>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                driftStatus === "synced"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : driftStatus === "slight-drift"
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {driftStatus === "synced" ? "In Sync" : driftStatus === "slight-drift" ? "Drifting" : "Out of Sync"}
            </span>
          </div>

          {/* WebRTC Voice */}
          <div className="flex items-center justify-between rounded-xl border border-white/[.08] bg-white/[.02] p-3">
            <div className="flex items-center gap-2.5">
              {getStatusIcon(voiceConnected ? "good" : "good")}
              <div>
                <p className="text-xs font-bold text-white">WebRTC Mesh Audio</p>
                <p className="text-[11px] text-neutral-400">
                  {voiceConnected ? `Connected to ${voicePeerCount} peers` : "Microphone unmuted / Inactive"}
                </p>
              </div>
            </div>
            <span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-neutral-400">
              {voiceConnected ? "ACTIVE" : "STANDBY"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-between gap-2">
          <Button
            onClick={copyDiagnosticReport}
            variant="outline"
            className="h-9 rounded-xl border-white/10 bg-white/5 text-xs font-bold text-white hover:bg-white/10"
          >
            <Copy size={13} className="mr-1.5" />
            Copy Report
          </Button>

          <div className="flex items-center gap-2">
            {onForceResync && (
              <Button
                onClick={onForceResync}
                variant="outline"
                className="h-9 rounded-xl border-[#d6ff3f]/30 bg-[#d6ff3f]/10 text-xs font-bold text-[#d6ff3f] hover:bg-[#d6ff3f]/20"
              >
                <RefreshCw size={13} className="mr-1.5" />
                Force Sync
              </Button>
            )}
            <Button
              onClick={onClose}
              className="h-9 rounded-xl bg-white px-4 text-xs font-bold text-black hover:bg-neutral-200"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
