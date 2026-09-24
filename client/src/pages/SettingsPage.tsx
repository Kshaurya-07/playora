import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Settings,
  Sliders,
  Volume2,
  Zap,
  Activity,
  User as UserIcon,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Settings State (Persisted in localStorage)
  const [syncTolerance, setSyncTolerance] = useState<"strict" | "balanced" | "relaxed">(() => {
    return (localStorage.getItem("playora_sync_tolerance") as any) || "balanced";
  });

  const [soundEffects, setSoundEffects] = useState<boolean>(() => {
    return localStorage.getItem("playora_sfx") !== "false";
  });

  const [highRefreshMode, setHighRefreshMode] = useState<boolean>(() => {
    return localStorage.getItem("playora_high_refresh") === "true";
  });

  const [autoPlayOnJoin, setAutoPlayOnJoin] = useState<boolean>(() => {
    return localStorage.getItem("playora_autoplay") !== "false";
  });

  const [preferredQuality, setPreferredQuality] = useState<string>(() => {
    return localStorage.getItem("playora_quality") || "auto";
  });

  useEffect(() => {
    localStorage.setItem("playora_sync_tolerance", syncTolerance);
  }, [syncTolerance]);

  useEffect(() => {
    localStorage.setItem("playora_sfx", String(soundEffects));
  }, [soundEffects]);

  useEffect(() => {
    localStorage.setItem("playora_high_refresh", String(highRefreshMode));
  }, [highRefreshMode]);

  useEffect(() => {
    localStorage.setItem("playora_autoplay", String(autoPlayOnJoin));
  }, [autoPlayOnJoin]);

  useEffect(() => {
    localStorage.setItem("playora_quality", preferredQuality);
  }, [preferredQuality]);

  const handleResetDefaults = () => {
    setSyncTolerance("balanced");
    setSoundEffects(true);
    setHighRefreshMode(false);
    setAutoPlayOnJoin(true);
    setPreferredQuality("auto");
    toast.success("Settings restored to factory defaults");
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col pb-20 md:pb-10">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d6ff3f]/10 border border-[#d6ff3f]/20 text-[#d6ff3f] text-xs font-semibold mb-2">
              <Settings size={14} />
              <span>User Preferences & Engine Tuning</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Playback & App Settings
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Customize synchronization thresholds, display refresh optimizations, audio cues, and account preferences.
            </p>
          </div>

          <Button
            onClick={handleResetDefaults}
            variant="outline"
            size="sm"
            className="border-white/10 hover:border-white/20 text-xs text-zinc-300 hover:text-white"
          >
            <RotateCcw size={13} className="mr-1.5" />
            <span>Restore Defaults</span>
          </Button>
        </div>

        {/* Section 1: Playback Synchronization Engine */}
        <div className="rounded-3xl border border-white/10 bg-[#0d111b]/80 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <Sliders size={18} className="text-[#d6ff3f]" />
            <div>
              <h2 className="text-base font-bold text-white">Playback Drift Synchronization</h2>
              <p className="text-xs text-zinc-400">
                Determines how aggressively PlayOra aligns your local video clock with the party host.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              {
                id: "strict",
                title: "Strict (0.5s)",
                desc: "Immediate seek adjustment for frame-exact sync on fast connections.",
              },
              {
                id: "balanced",
                title: "Balanced (1.5s)",
                desc: "Recommended. Smooth rate nudging without frequent seek disruptions.",
              },
              {
                id: "relaxed",
                title: "Relaxed (3.0s)",
                desc: "Generous margin for mobile data or variable latency connections.",
              },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setSyncTolerance(mode.id as any);
                  toast.success(`Sync tolerance set to ${mode.title}`);
                }}
                className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                  syncTolerance === mode.id
                    ? "border-[#d6ff3f] bg-[#d6ff3f]/10 text-white shadow-md shadow-[#d6ff3f]/10"
                    : "border-white/5 bg-white/[0.02] text-zinc-400 hover:border-white/10 hover:text-zinc-200"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{mode.title}</span>
                    {syncTolerance === mode.id && (
                      <Check size={16} className="text-[#d6ff3f]" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{mode.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Audio & Immersion Controls */}
        <div className="rounded-3xl border border-white/10 bg-[#0d111b]/80 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <Volume2 size={18} className="text-purple-400" />
            <div>
              <h2 className="text-base font-bold text-white">Audio & Atmosphere</h2>
              <p className="text-xs text-zinc-400">Manage interface audio cues and playback start behavior.</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.02]">
              <div>
                <span className="text-sm font-semibold text-white">Sound Effects (SFX)</span>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Play auditory cues when members join or send chat messages.
                </p>
              </div>
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={(e) => setSoundEffects(e.target.checked)}
                className="h-5 w-5 accent-[#d6ff3f] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.02]">
              <div>
                <span className="text-sm font-semibold text-white">Autoplay on Room Entry</span>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Instantly begin video playback upon entering active rooms.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoPlayOnJoin}
                onChange={(e) => setAutoPlayOnJoin(e.target.checked)}
                className="h-5 w-5 accent-[#d6ff3f] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Performance & 120Hz Displays */}
        <div className="rounded-3xl border border-white/10 bg-[#0d111b]/80 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <Zap size={18} className="text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">High Refresh & GPU Acceleration</h2>
              <p className="text-xs text-zinc-400">Optimize visual smoothness for 90Hz/120Hz/144Hz displays.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div>
              <span className="text-sm font-semibold text-white">Ultra-Smooth 120Hz Mode</span>
              <p className="text-xs text-zinc-400 mt-0.5">
                Reduces heavy multi-layer backdrop blurs to achieve solid 120 FPS animations on mobile and laptop GPUs.
              </p>
            </div>
            <input
              type="checkbox"
              checked={highRefreshMode}
              onChange={(e) => setHighRefreshMode(e.target.checked)}
              className="h-5 w-5 accent-[#d6ff3f] cursor-pointer"
            />
          </div>
        </div>

        {/* Section 4: System & Diagnostics */}
        <div className="rounded-3xl border border-white/10 bg-[#0d111b]/80 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity size={18} className="text-emerald-400" />
              <div>
                <h2 className="text-base font-bold text-white">System Diagnostics & Environment</h2>
                <p className="text-xs text-zinc-400">
                  Inspect WebSocket latency, Google OAuth verification, and streaming engine health.
                </p>
              </div>
            </div>

            <Link href="/diagnostics">
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-xs font-semibold text-zinc-300 hover:text-white"
              >
                <span>Open Diagnostics</span>
                <ExternalLink size={13} className="ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
