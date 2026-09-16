import React from "react";
import { Zap, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DriftStatus } from "@shared/watch-party";

interface SyncStatusIndicatorProps {
  status: DriftStatus;
  driftSeconds: number;
  latencyMs: number;
  onSyncNow: () => void;
  showSyncButton?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status,
  driftSeconds,
  latencyMs,
  onSyncNow,
  showSyncButton = true,
}) => {
  const isSynced = status === "synced";
  const isSlightDrift = status === "slight-drift";
  const isOutOfSync = status === "out-of-sync";

  let statusConfig = {
    label: "Synced",
    dotColor: "bg-[#d6ff3f]",
    textColor: "text-[#d6ff3f]",
    bgColor: "bg-[#d6ff3f]/10",
    borderColor: "border-[#d6ff3f]/30",
  };

  if (isSlightDrift) {
    statusConfig = {
      label: `Drift: ${Math.abs(driftSeconds).toFixed(1)}s`,
      dotColor: "bg-amber-400",
      textColor: "text-amber-400",
      bgColor: "bg-amber-400/10",
      borderColor: "border-amber-400/30",
    };
  } else if (isOutOfSync) {
    statusConfig = {
      label: `Out of Sync (${Math.abs(driftSeconds).toFixed(1)}s)`,
      dotColor: "bg-red-500",
      textColor: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
    };
  }

  return (
    <div className="flex items-center gap-2">
      {/* Network Latency */}
      <div className="hidden items-center gap-1 rounded-lg border border-white/5 bg-white/[.02] px-2 py-1 text-[10px] text-neutral-400 sm:flex">
        <Wifi size={11} className="text-neutral-500" />
        <span>{latencyMs}ms</span>
      </div>

      {/* Drift Status Badge */}
      <div
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${statusConfig.bgColor} ${statusConfig.borderColor} ${statusConfig.textColor}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColor} ${isSynced ? "" : "animate-ping"}`} />
        <span>{statusConfig.label}</span>
      </div>

      {/* One-Click Sync Button */}
      {showSyncButton && (
        <Button
          onClick={onSyncNow}
          className={`h-7 rounded-lg px-2.5 text-[10px] font-extrabold ${
            isOutOfSync
              ? "bg-red-500 text-white hover:bg-red-400 animate-pulse"
              : isSlightDrift
              ? "bg-amber-400 text-black hover:bg-amber-300"
              : "border border-[#d6ff3f]/30 bg-[#d6ff3f]/10 text-[#d6ff3f] hover:bg-[#d6ff3f]/20"
          }`}
        >
          <Zap size={11} className="mr-1" />
          Sync now
        </Button>
      )}
    </div>
  );
};
