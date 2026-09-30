import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CreatePartyModal } from "@/components/CreatePartyModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Globe,
  Radio,
  Users,
  Mic,
  Tv,
  Film,
  Sparkles,
  Search,
  Lock,
  ShieldCheck,
  Flame,
  Clock,
  ArrowRight,
  Plus,
  Play,
  Copy,
  ExternalLink,
  Layers,
  Gamepad2,
  Music,
  Trophy,
  Coffee,
  MessageSquare,
  Laugh,
  Laptop,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All Categories", icon: Globe },
  { id: "movies", label: "Movies", icon: Film },
  { id: "series", label: "Series", icon: Tv },
  { id: "anime", label: "Anime", icon: Sparkles },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "music", label: "Music", icon: Music },
  { id: "sports", label: "Sports", icon: Trophy },
  { id: "watchalong", label: "Watch Along", icon: Radio },
  { id: "tech", label: "Tech & Talks", icon: Laptop },
  { id: "hangout", label: "Chill Hangout", icon: Coffee },
  { id: "podcasts", label: "Podcasts", icon: MessageSquare },
  { id: "comedy", label: "Comedy", icon: Laugh },
];

const PLATFORMS = [
  { id: "all", label: "All Platforms" },
  { id: "youtube", label: "YouTube" },
  { id: "twitch", label: "Twitch" },
  { id: "kick", label: "Kick" },
  { id: "vimeo", label: "Vimeo" },
  { id: "generic", label: "Custom URL" },
];

export default function WorldPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [sort, setSort] = useState<"trending" | "viewers" | "recent">("trending");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Password prompt state
  const [passwordPromptRoom, setPasswordPromptRoom] = useState<{ code: string; title: string } | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // Real-time world stats
  const { data: stats } = trpc.world.getStats.useQuery(undefined, {
    refetchInterval: 10000,
  });

  // World parties listing
  const { data: partiesData, isLoading } = trpc.world.listParties.useQuery(
    {
      category: selectedCategory === "all" ? undefined : selectedCategory,
      platform: selectedPlatform === "all" ? undefined : selectedPlatform,
      search: search.trim() ? search.trim() : undefined,
      sort,
      page: 1,
      limit: 30,
    },
    {
      refetchInterval: 8000,
    }
  );

  const parties = partiesData?.parties || [];

  const verifyPasswordMutation = trpc.party.verifyPassword.useMutation({
    onSuccess: (res) => {
      setIsVerifyingPassword(false);
      if (res.valid || res.success) {
        toast.success("Password accepted! Entering party...");
        if (passwordPromptRoom) {
          setLocation(`/party/${passwordPromptRoom.code}`);
        }
        setPasswordPromptRoom(null);
        setPasswordInput("");
      } else {
        toast.error("Incorrect room password.");
      }
    },
    onError: (err) => {
      setIsVerifyingPassword(false);
      toast.error(err.message || "Failed to verify password");
    },
  });

  const handleJoinClick = (room: any) => {
    if (room.accessMode === "password") {
      setPasswordPromptRoom({ code: room.code, title: room.title });
    } else {
      setLocation(`/party/${room.code}`);
    }
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordPromptRoom || !passwordInput.trim()) return;
    setIsVerifyingPassword(true);
    verifyPasswordMutation.mutate({
      code: passwordPromptRoom.code,
      password: passwordInput,
    });
  };

  const copyRoomLink = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/party/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Party link copied!", { description: url });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f3f5fa] flex flex-col pb-24 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* World Hero & Live Telemetry Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c0d12] via-[#09090c] to-[#050505] p-6 sm:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#d6ff3f]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#d6ff3f]">
                <Globe size={14} className="animate-spin-slow" />
                <span>PlayOra World Discovery</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                Live Watch Parties Around The Globe
              </h1>

              <p className="text-sm sm:text-base text-zinc-400">
                Discover trending public streams, sync movies with strangers or friends, jump into live voice rooms, and experience synchronized media together in real time.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="bg-[#d6ff3f] text-[#050505] font-bold hover:bg-[#c2eb30] rounded-xl px-5 py-2.5 shadow-[0_0_25px_rgba(214,255,63,0.3)] transition transform active:scale-95"
                >
                  <Plus size={18} className="mr-1.5" />
                  Host a World Party
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const topParty = parties[0];
                    if (topParty) handleJoinClick(topParty);
                    else toast.info("No active public parties right now. Start the first one!");
                  }}
                  className="border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-xl"
                >
                  <Flame size={16} className="mr-1.5 text-amber-400" />
                  Jump into #1 Trending
                </Button>
              </div>
            </div>

            {/* Live Telemetry Stats Box */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 w-full lg:w-auto min-w-[280px]">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Radio size={14} className="text-[#d6ff3f]" />
                  Active Rooms
                </span>
                <span className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {stats?.activeParties ?? (parties.length || 0)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-400" />
                  Live Viewers
                </span>
                <span className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {stats?.totalViewers ?? 0}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Mic size={14} className="text-purple-400" />
                  Voice Channels
                </span>
                <span className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {Math.max(1, Math.floor((stats?.activeParties ?? 0) * 0.7))}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Tv size={14} className="text-blue-400" />
                  Platforms
                </span>
                <span className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {Object.keys(stats?.platformBreakdown || {}).length || 5}+
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search parties by title, streamer, or topic..."
                className="pl-10 rounded-xl bg-[#0c0d12] border-white/10 text-white placeholder:text-zinc-500 focus:border-[#d6ff3f]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sort Dropdown / Segmented Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0c0d12] border border-white/10 text-xs font-medium self-end sm:self-auto">
              <button
                onClick={() => setSort("trending")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  sort === "trending"
                    ? "bg-white/15 text-white font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                🔥 Trending
              </button>
              <button
                onClick={() => setSort("viewers")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  sort === "viewers"
                    ? "bg-white/15 text-white font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                👥 Most Viewers
              </button>
              <button
                onClick={() => setSort("recent")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  sort === "recent"
                    ? "bg-white/15 text-white font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                ⏱ Newest
              </button>
            </div>
          </div>

          {/* 12 Categories Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                    isSelected
                      ? "bg-[#d6ff3f] text-[#050505] border-[#d6ff3f] shadow-[0_0_15px_rgba(214,255,63,0.25)]"
                      : "bg-[#0c0d12] text-zinc-400 border-white/10 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={14} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Platform Filters Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-zinc-400">
            <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-500 mr-1">
              Source:
            </span>
            {PLATFORMS.map((plat) => {
              const isSelected = selectedPlatform === plat.id;
              return (
                <button
                  key={plat.id}
                  onClick={() => setSelectedPlatform(plat.id)}
                  className={`px-3 py-1 rounded-lg border transition ${
                    isSelected
                      ? "bg-white/15 text-white border-white/20 font-bold"
                      : "bg-transparent border-transparent hover:bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  {plat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Parties Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-[#0c0d12] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : parties.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-white/10 bg-[#0c0d12] p-8 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-zinc-400">
              <Globe size={32} />
            </div>
            <h3 className="text-xl font-bold text-white">No Public Watch Parties Found</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              {search || selectedCategory !== "all" || selectedPlatform !== "all"
                ? "No active parties match your current search or category filter. Try clearing filters or create your own."
                : "There are currently no active public watch parties. You can be the first to broadcast and host one!"}
            </p>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-[#d6ff3f] text-[#050505] font-bold hover:bg-[#c2eb30] rounded-xl px-6 py-2"
            >
              <Plus size={16} className="mr-1.5" />
              Create First Party
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {parties.map((party) => {
              const isPasswordProtected = party.accessMode === "password";
              const isApprovalRequired = party.accessMode === "approval";

              return (
                <div
                  key={party.code}
                  onClick={() => handleJoinClick(party)}
                  className="group relative cursor-pointer rounded-2xl border border-white/10 bg-[#0c0d12] p-5 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-[#d6ff3f]/50 hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Room Code + Live Viewer Pill */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#d6ff3f] px-2 py-0.5 rounded-md bg-[#d6ff3f]/10 border border-[#d6ff3f]/20">
                        {party.code}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isPasswordProtected && (
                          <span
                            title="Password Protected"
                            className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs"
                          >
                            <Lock size={12} />
                          </span>
                        )}
                        {isApprovalRequired && (
                          <span
                            title="Host Approval Required"
                            className="p-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs"
                          >
                            <ShieldCheck size={12} />
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{party.viewerCount || 1} watching</span>
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-[#d6ff3f] transition line-clamp-1">
                        {party.title}
                      </h3>
                      {party.description ? (
                        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                          {party.description}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-zinc-500 italic">
                          Streaming on {party.platform.toUpperCase()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Host info & Action */}
                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {party.hostAvatar ? (
                        <img
                          src={party.hostAvatar}
                          alt={party.hostName || "Host"}
                          className="h-6 w-6 rounded-full object-cover ring-1 ring-white/10"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                          {(party.hostName || "H").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-300 max-w-[100px] truncate">
                          {party.hostName || "Host"}
                        </span>
                        {party.hostPlayoraId && (
                          <span className="text-[10px] text-zinc-500 font-mono">
                            @{party.hostPlayoraId}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => copyRoomLink(e, party.code)}
                        title="Copy invite link"
                        className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition"
                      >
                        <Copy size={13} />
                      </button>

                      <Button
                        size="sm"
                        className="bg-white/10 text-white font-semibold group-hover:bg-[#d6ff3f] group-hover:text-[#050505] transition rounded-lg h-7 px-2.5 text-xs"
                      >
                        Join
                        <ArrowRight size={12} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Password Prompt Modal */}
      {passwordPromptRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0c0d12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Lock size={18} />
              <span>Password Required</span>
            </div>
            <p className="text-xs text-zinc-400">
              The watch party <strong className="text-white">"{passwordPromptRoom.title}"</strong> is protected by a password.
            </p>
            <form onSubmit={handleVerifyPassword} className="space-y-3">
              <Input
                type="password"
                autoFocus
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter room password..."
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPasswordPromptRoom(null);
                    setPasswordInput("");
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isVerifyingPassword}
                  className="bg-[#d6ff3f] text-[#050505] font-bold hover:bg-[#c2eb30]"
                >
                  {isVerifyingPassword ? "Verifying..." : "Unlock & Enter"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Party Modal */}
      <CreatePartyModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <MobileBottomNav />
    </div>
  );
}
