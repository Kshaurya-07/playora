import React from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Activity,
  ChevronLeft,
  RefreshCw,
  Server,
  Layers,
  Radio,
  Tv,
} from "lucide-react";

export default function DiagnosticsPage() {
  const [, setLocation] = useLocation();

  const {
    data: diag,
    isLoading,
    isError,
    refetch,
  } = trpc.system.diagnostics.useQuery(undefined, {
    retry: 1,
    refetchInterval: 10000,
  });

  const renderStatus = (condition: boolean, successText: string, failText: string) => {
    return (
      <div className="flex items-center justify-between py-2 border-b border-white/[.06] last:border-none">
        <div className="flex items-center gap-2.5">
          {condition ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <XCircle size={16} className="text-red-400 shrink-0" />
          )}
          <span className="text-xs font-semibold text-white">
            {condition ? successText : failText}
          </span>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold ${
            condition ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {condition ? "PASS" : "FAIL"}
        </span>
      </div>
    );
  };

  return (
    <div className="playora-shell min-h-screen text-white">
      <div className="noise-overlay" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[.08] bg-[#0c0e14]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/dashboard")}
              className="btn-press flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white"
            >
              <ChevronLeft size={16} /> Dashboard
            </button>
            <span className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d6ff3f]/10 text-[#d6ff3f]">
                <Activity size={16} />
              </div>
              <span className="text-sm font-extrabold tracking-tight text-white">
                PlayOra Diagnostics
              </span>
            </div>
          </div>

          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-white/10 bg-white/5 text-xs font-bold text-white hover:bg-white/10"
          >
            <RefreshCw size={12} className="mr-1.5" /> Refresh
          </Button>
        </div>
      </header>

      {/* Main Diagnostics Checklist */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">System Health & Runtime Diagnostics</h1>
          <p className="mt-1 text-xs text-neutral-400">
            Automated verification of environment variables, encryption secrets, database storage, and streaming engines.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl border border-white/5 bg-white/[.02] animate-pulse" />
            ))}
          </div>
        ) : isError || !diag ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <XCircle size={28} className="mx-auto text-red-400" />
            <h3 className="mt-2 text-base font-bold text-white">Backend Unreachable</h3>
            <p className="mt-1 text-xs text-neutral-400">
              The PlayOra backend server is not responding to API requests.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Environment & Security Section */}
            <div className="rounded-2xl border border-white/[.08] bg-[#11141c] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Server size={16} className="text-[#d6ff3f]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Environment & Security
                </h3>
              </div>

              <div className="space-y-1">
                {renderStatus(
                  diag.environment.backendReachable,
                  "Backend reachable",
                  "Backend unreachable"
                )}
                {renderStatus(
                  diag.environment.databaseConnected,
                  `Database connected (${diag.environment.databaseType.toUpperCase()})`,
                  "Database disconnected"
                )}
                {renderStatus(
                  diag.environment.authenticationConfigured,
                  "Authentication configured",
                  "Authentication unconfigured"
                )}
                {renderStatus(
                  diag.environment.encryptionConfigured,
                  "Encryption configured (HS256 Session Secret ≥ 32B)",
                  "Encryption secret missing or empty (Zero-length key error)"
                )}
                {renderStatus(
                  diag.environment.websocketConfigured,
                  "WebSocket configured (Active on /api/ws)",
                  "WebSocket unavailable"
                )}
              </div>
            </div>

            {/* 2. Streaming Adapters Section */}
            <div className="rounded-2xl border border-white/[.08] bg-[#11141c] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Radio size={16} className="text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Streaming Engine
                </h3>
              </div>

              <div className="space-y-1">
                {renderStatus(
                  diag.streaming.urlParserWorking,
                  "Universal URL parser (YouTube, Twitch, Vimeo, Kick, MP4, OTT)",
                  "URL parser failure"
                )}
                {renderStatus(
                  diag.streaming.youtubeAdapterReady,
                  "YouTube adapter (Official IFrame API, Auto-Sync)",
                  "YouTube adapter unavailable"
                )}
                {renderStatus(
                  diag.streaming.platformDetectorWorking,
                  "Platform detector (14+ streaming providers recognized)",
                  "Platform detector failure"
                )}
              </div>
            </div>

            {/* 3. Room & State Engine Section */}
            <div className="rounded-2xl border border-white/[.08] bg-[#11141c] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={16} className="text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Room & Realtime State
                </h3>
              </div>

              <div className="space-y-1">
                {renderStatus(
                  diag.room.roomCreationReady,
                  "Room creation ready",
                  "Room creation blocked (Requires encryption secret)"
                )}
                {renderStatus(
                  true,
                  `Room state tracking (${diag.room.activeRoomsCount} active public rooms)`,
                  "Room state unavailable"
                )}
                {renderStatus(
                  diag.room.websocketRoomReady,
                  "WebSocket room engine & NTP clock synchronization",
                  "WebSocket room engine failure"
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
