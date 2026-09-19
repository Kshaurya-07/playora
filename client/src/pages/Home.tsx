import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  PLATFORM_LIST,
  PlatformId,
  PLATFORM_REGISTRY,
  resolveStreamingContent,
} from "@shared/watch-party";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  Copy,
  Film,
  Flame,
  Heart,
  Link2,
  Lock,
  MessageCircle,
  Mic,
  Play,
  Plus,
  Radio,
  Share2,
  Sparkles,
  Tv,
  Users,
  Waves,
  X,
  Youtube,
  Zap,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#d6ff3f] text-[#11150e] shadow-[0_0_25px_rgba(214,255,63,.2)]">
        <Waves size={18} strokeWidth={2.6} />
      </div>
      {!compact && (
        <span className="text-[16px] font-extrabold tracking-[-.03em] text-white">
          playora<span className="text-[#d6ff3f]">.</span>
        </span>
      )}
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  // Create party form state
  const [roomName, setRoomName] = useState("Friday Movie Night");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>("youtube");
  const [contentUrl, setContentUrl] = useState("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  const [hostOnly, setHostOnly] = useState(true);

  const handleContentUrlChange = (val: string) => {
    setContentUrl(val);
    if (val.trim()) {
      const res = resolveStreamingContent(val.trim());
      if (res.platform !== "generic") {
        setSelectedPlatform(res.platform);
      }
    }
  };

  const resolvedPreview = contentUrl.trim() ? resolveStreamingContent(contentUrl.trim()) : null;

  const createPartyMutation = trpc.party.create.useMutation({
    onSuccess: (room) => {
      toast.success("Party is ready!", {
        description: `Invite code: ${room.code}`,
      });
      setLocation(`/party/${room.code}`);
    },
    onError: (err) => {
      const rawMsg = err.message || "";
      if (
        rawMsg.includes("Zero-length key") ||
        rawMsg.includes("security configuration") ||
        rawMsg.includes("JWT_SECRET")
      ) {
        toast.error("Unable to create party", {
          description:
            "The server security configuration is incomplete. Please check the PlayOra server environment configuration.",
        });
      } else {
        toast.error(rawMsg || "Failed to create room");
      }
    },
  });

  const handleCreateSubmit = () => {
    if (!roomName.trim()) {
      toast.error("Please enter a room name");
      return;
    }
    if (!contentUrl.trim()) {
      toast.error("Please enter a content URL");
      return;
    }

    createPartyMutation.mutate({
      title: roomName.trim(),
      platform: selectedPlatform,
      contentUrl: contentUrl.trim(),
      hostName: user?.name || "Host",
      settings: {
        hostOnlyControls: hostOnly,
        lockSeeking: false,
        allowReactions: true,
        allowVoice: true,
        isPublic: true,
      },
    });
  };

  const handleJoinSubmit = () => {
    let clean = joinCode.trim().toUpperCase();
    if (clean.includes("/PARTY/")) {
      clean = clean.split("/PARTY/")[1]?.split("?")[0] || clean;
    }
    if (!clean) {
      toast.error("Please enter an invite code or party link");
      return;
    }
    setLocation(`/party/${clean}`);
  };

  const featureStats = [
    {
      num: "01",
      title: "Real-Time Sync",
      desc: "Server clock synchronization and latency compensation keep everyone aligned down to the sub-second.",
    },
    {
      num: "02",
      title: "Voice & Chat",
      desc: "Instant WebRTC mesh voice, live text chat, and animated reactions built directly into the player.",
    },
    {
      num: "03",
      title: "Any Platform",
      desc: "Automatic sync for YouTube and Twitch, plus Assisted Sync for Netflix, Prime Video, JioHotstar, and Kick.",
    },
  ];

  return (
    <div className="playora-shell relative min-h-screen overflow-hidden">
      <div className="noise-overlay" />
      <div className="ambient-orb left-[10%] top-[16%] bg-[#d6ff3f]" />
      <div className="ambient-orb right-[8%] top-[6%] bg-[#566de4]" />

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-[1240px] items-center justify-between px-6 py-6 lg:px-8">
        <Brand />
        <nav className="hidden items-center gap-8 text-[12px] font-semibold text-[#8c93a5] md:flex">
          <a href="#how-it-works" className="transition hover:text-white">
            How it works
          </a>
          <a href="#platforms" className="transition hover:text-white">
            Platforms
          </a>
          <a href="#safety" className="transition hover:text-white">
            Built responsibly
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
            className="h-9 rounded-full border-white/10 bg-white/5 px-4 text-xs font-bold text-white hover:bg-white/10"
          >
            <LayoutDashboard size={14} className="mr-1.5" /> Dashboard
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="btn-press h-9 rounded-full bg-[#d6ff3f] px-4 text-[11px] font-extrabold text-[#10150d] hover:bg-[#e1ff70]"
          >
            Start a party <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-[1240px] px-6 pb-20 pt-12 lg:px-8 lg:pt-20">
        <section className="grid items-center gap-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d6ff3f]/20 bg-[#d6ff3f]/[.07] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#d6ff3f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d6ff3f] status-pulse" />
              The social layer for streaming
            </div>

            <h1 className="max-w-[650px] text-[clamp(3.4rem,6.5vw,6.4rem)] font-black leading-[.94] tracking-[-.06em] text-white">
              Watch together.
              <br />
              <span className="text-[#8c93a5]">Feel every</span>
              <br />
              <span className="text-[#d6ff3f]">moment.</span>
            </h1>

            <p className="mt-8 max-w-[480px] text-[15px] leading-7 text-[#9ba2b3]">
              Sync your watch party, talk in real-time WebRTC voice, and react to every scene
              together — wherever everyone happens to be.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setCreateOpen(true)}
                className="btn-press h-12 rounded-xl bg-[#d6ff3f] px-6 text-[12px] font-extrabold text-[#10150d] shadow-[0_10px_35px_rgba(214,255,63,.15)] hover:bg-[#e1ff70]"
              >
                Create a watch party <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button
                onClick={() => setJoinOpen(true)}
                variant="outline"
                className="btn-press h-12 rounded-xl border-white/[.13] bg-white/[.03] px-6 text-[12px] font-bold text-white hover:bg-white/[.08]"
              >
                Join with an invite
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-3 text-xs text-neutral-400">
              <div className="flex -space-x-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#e99658] text-[10px] font-bold text-black ring-2 ring-[#0a0b0f]">
                  RM
                </span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#c47bde] text-[10px] font-bold text-black ring-2 ring-[#0a0b0f]">
                  AS
                </span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#8eabe9] text-[10px] font-bold text-black ring-2 ring-[#0a0b0f]">
                  YO
                </span>
              </div>
              <span>
                <strong className="font-bold text-white">12,840+</strong> shared moments this week
              </span>
            </div>
          </div>

          {/* Interactive Hero Visual Showcase */}
          <div className="relative min-h-[380px] lg:min-h-[480px]">
            <div className="absolute right-[4%] top-[5%] h-[88%] w-[88%] rotate-[3deg] rounded-[24px] border border-white/[.08] bg-[#161a27] shadow-[0_35px_100px_rgba(0,0,0,.4)]" />
            <div className="glass relative overflow-hidden rounded-[24px] border border-white/[.1] p-3.5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[.07] px-3 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#ff4d4d]" />
                  <span className="text-[11px] font-bold text-white">Friday Movie Night</span>
                </div>
                <span className="rounded-full bg-[#d6ff3f]/15 px-2.5 py-0.5 text-[9px] font-bold text-[#d6ff3f]">
                  ● LIVE SYNC
                </span>
              </div>

              <div className="relative mt-3 aspect-video overflow-hidden rounded-2xl bg-[#1a1f32]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_30%,rgba(218,191,132,.5),transparent_25%),linear-gradient(135deg,#2d3a5b_0%,#101622_52%,#07090e_100%)]" />
                <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-black to-transparent" />

                <div className="absolute left-6 top-6">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">
                    Now playing · YouTube
                  </p>
                  <p className="mt-1 text-xl font-black text-white">The Art of Cinema</p>
                </div>

                <div className="absolute bottom-4 left-5 right-5">
                  <div className="mb-2 h-1 rounded-full bg-white/20">
                    <div className="h-full w-[65%] rounded-full bg-[#d6ff3f] shadow-[0_0_12px_rgba(214,255,63,.5)]" />
                  </div>
                  <div className="flex justify-between font-mono text-[9px] text-neutral-400">
                    <span>1:24:32</span>
                    <span>2:05:18</span>
                  </div>
                </div>

                <div className="absolute right-6 bottom-16 flex -space-x-1">
                  <span className="rounded-full bg-red-500/90 px-2 py-0.5 text-xs">🔥</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-black">❤️</span>
                </div>

                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/40 p-4 text-white backdrop-blur-md">
                  <Play size={22} className="ml-1 fill-current" />
                </div>
              </div>

              <div className="flex items-center justify-between px-2 pt-3">
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                  <Users size={13} className="text-[#d6ff3f]" />
                  <span>4 watching together</span>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-[9px] text-neutral-300">
                    🎙 Voice Connected
                  </span>
                  <span className="rounded-md bg-[#d6ff3f]/15 px-2 py-0.5 text-[9px] font-bold text-[#d6ff3f]">
                    Synced (0.1s)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section id="how-it-works" className="mt-28 border-t border-white/[.08] pt-12">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#d6ff3f]">
                01 / How It Works
              </p>
              <h2 className="mt-3 max-w-[480px] text-3xl font-black tracking-tight text-white md:text-4xl">
                Less setup. More <span className="text-neutral-500">“remember when?”</span>
              </h2>
            </div>
            <p className="hidden max-w-xs text-right text-xs leading-relaxed text-neutral-400 md:block">
              Content stays on your legitimate streaming service. PlayOra brings everyone into the same
              moment.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {featureStats.map((item) => (
              <div
                key={item.num}
                className="group rounded-2xl border border-white/[.08] bg-white/[.02] p-6 transition hover:-translate-y-1 hover:border-[#d6ff3f]/30 hover:bg-[#d6ff3f]/[0.03]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#d6ff3f]">{item.num}</span>
                  <ArrowRight
                    size={16}
                    className="text-neutral-600 transition group-hover:translate-x-1 group-hover:text-[#d6ff3f]"
                  />
                </div>
                <h3 className="mt-8 text-base font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Platform Support Matrix */}
        <section id="platforms" className="mt-24 border-t border-white/[.08] pt-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#d6ff3f]">
                02 / Bring Your Own Screen
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
                Supported Streaming Platforms
              </h2>
            </div>
            <p className="text-xs text-neutral-400">
              Clear capabilities: Automatic programmatic sync vs. Assisted companion sync.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PLATFORM_LIST.map((plat) => {
              const isAuto = plat.capabilities.syncCapability === "automatic";
              return (
                <div
                  key={plat.id}
                  className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4 transition hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{plat.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${
                        isAuto
                          ? "bg-[#d6ff3f]/15 text-[#d6ff3f]"
                          : "bg-amber-400/15 text-amber-300"
                      }`}
                    >
                      {isAuto ? "Auto Sync" : "Assisted"}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
                    {plat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Responsibly Built Footer */}
      <footer
        id="safety"
        className="relative z-10 mx-auto flex max-w-[1240px] flex-col gap-3 border-t border-white/[.08] px-6 py-8 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"
      >
        <span>© 2026 PlayOra. The real-time watch party platform.</span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-[#d6ff3f]" />
          DRM-Compliant: We synchronize playback timecodes, never re-stream or redistribute media.
        </span>
      </footer>

      {/* Create Room Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="glass w-full max-w-lg rounded-3xl border border-white/[.12] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#d6ff3f]">
                  New Party
                </span>
                <h2 className="mt-1 text-2xl font-black text-white">Set the Scene</h2>
                <p className="mt-1 text-xs text-neutral-400">
                  Pick a name, choose your streaming service, and invite friends.
                </p>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Room Name
                </label>
                <Input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Anime Night"
                  className="mt-1.5 h-11 border-white/10 bg-black/40 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Streaming Platform
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {PLATFORM_LIST.map((plat) => {
                    const isSelected = selectedPlatform === plat.id;
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlatform(plat.id);
                          setContentUrl(plat.defaultUrl);
                        }}
                        className={`btn-press flex flex-col items-center justify-center rounded-xl border p-2 text-center transition ${
                          isSelected
                            ? "border-[#d6ff3f] bg-[#d6ff3f]/10 text-white"
                            : "border-white/5 bg-white/[.02] text-neutral-400 hover:border-white/10"
                        }`}
                      >
                        <span className="text-[11px] font-bold">{plat.name}</span>
                        <span
                          className={`mt-0.5 text-[8px] font-semibold ${
                            plat.capabilities.syncCapability === "automatic"
                              ? "text-[#d6ff3f]"
                              : "text-amber-400"
                          }`}
                        >
                          {plat.capabilities.syncCapability === "automatic" ? "Auto" : "Assisted"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Content URL
                </label>
                <Input
                  value={contentUrl}
                  onChange={(e) => handleContentUrlChange(e.target.value)}
                  placeholder="Paste YouTube, Twitch, Vimeo, MP4, or OTT URL..."
                  className="mt-1.5 h-11 border-white/10 bg-black/40 text-xs text-white font-mono"
                />
                {resolvedPreview && resolvedPreview.platform !== "generic" && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#d6ff3f]/20 bg-[#d6ff3f]/5 px-3 py-1.5 text-[11px] text-neutral-300">
                    <Sparkles size={12} className="text-[#d6ff3f] shrink-0" />
                    <span>Detected:</span>
                    <strong className="text-white">{resolvedPreview.platformName}</strong>
                    <span className="text-neutral-500">•</span>
                    <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-bold text-[#d6ff3f]">
                      {resolvedPreview.capabilities.syncCapability === "automatic" ? "Auto-Sync" : "Companion Sync"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[.02] p-3">
                <div>
                  <span className="text-xs font-bold text-white">Host-Only Playback Control</span>
                  <p className="text-[10px] text-neutral-400">
                    Only you can play, pause, or seek
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={hostOnly}
                  onChange={(e) => setHostOnly(e.target.checked)}
                  className="h-4 w-4 accent-[#d6ff3f] cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
              <Button
                onClick={() => setCreateOpen(false)}
                variant="outline"
                className="h-10 rounded-xl border-white/10 text-xs font-bold text-neutral-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSubmit}
                disabled={createPartyMutation.isPending}
                className="h-10 rounded-xl bg-[#d6ff3f] px-5 text-xs font-extrabold text-black hover:bg-[#e1ff70]"
              >
                {createPartyMutation.isPending ? "Launching..." : "Launch Party"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {joinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="glass w-full max-w-md rounded-3xl border border-white/[.12] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#d6ff3f]">
                  Join Party
                </span>
                <h3 className="mt-1 text-xl font-black text-white">You’re on the List</h3>
                <p className="mt-1 text-xs text-neutral-400">
                  Paste the 8-character code or full invite link.
                </p>
              </div>
              <button
                onClick={() => setJoinOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5">
              <Input
                autoFocus
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. 7K4MZ2P9"
                className="h-12 border-white/10 bg-black/40 text-center font-mono text-base uppercase tracking-widest text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
              <Button
                onClick={() => setJoinOpen(false)}
                variant="outline"
                className="h-10 rounded-xl border-white/10 text-xs font-bold text-neutral-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoinSubmit}
                className="h-10 rounded-xl bg-[#d6ff3f] px-5 text-xs font-extrabold text-black hover:bg-[#e1ff70]"
              >
                Join Party <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
