import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  PLATFORM_LIST,
  PlatformId,
  PLATFORM_REGISTRY,
  detectPlatform,
} from "@shared/watch-party";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus,
  ArrowRight,
  Tv,
  Film,
  Radio,
  Youtube,
  Users,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  Settings,
  User as UserIcon,
  Search,
  Lock,
  Zap,
} from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, refresh } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");

  // Create form state
  const [partyTitle, setPartyTitle] = useState("Weekend Movie Night");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>("youtube");
  const [contentUrl, setContentUrl] = useState("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  const [hostOnlyControls, setHostOnlyControls] = useState(true);

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || "");
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || "#D6FF3F");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Fetch active rooms from backend
  const { data: activeRooms, isLoading: loadingRooms, refetch: refetchRooms } =
    trpc.party.list.useQuery();

  // Mutations
  const createPartyMutation = trpc.party.create.useMutation({
    onSuccess: (room) => {
      toast.success("Party created successfully!", {
        description: `Room code: ${room.code}`,
      });
      setLocation(`/party/${room.code}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create party");
    },
  });

  const guestLoginMutation = trpc.auth.guestLogin.useMutation({
    onSuccess: () => {
      refresh();
    },
  });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated");
      setIsEditingProfile(false);
      refresh();
    },
  });

  const handleCreateParty = async () => {
    if (!partyTitle.trim()) {
      toast.error("Please enter a room name");
      return;
    }
    if (!contentUrl.trim()) {
      toast.error("Please enter a content URL");
      return;
    }

    createPartyMutation.mutate({
      title: partyTitle.trim(),
      platform: selectedPlatform,
      contentUrl: contentUrl.trim(),
      hostName: user?.name || profileName || "Party Host",
      settings: {
        hostOnlyControls,
        lockSeeking: false,
        allowReactions: true,
        allowVoice: true,
        isPublic: true,
      },
    });
  };

  const handleJoinParty = () => {
    let cleanCode = joinCodeInput.trim().toUpperCase();
    if (cleanCode.includes("/PARTY/")) {
      cleanCode = cleanCode.split("/PARTY/")[1]?.split("?")[0] || cleanCode;
    }
    if (!cleanCode) {
      toast.error("Please enter an invite code or party link");
      return;
    }
    setLocation(`/party/${cleanCode}`);
  };

  const handlePlatformSelect = (id: PlatformId) => {
    setSelectedPlatform(id);
    const meta = PLATFORM_REGISTRY[id];
    if (meta && (!contentUrl || contentUrl.includes("youtube.com"))) {
      setContentUrl(meta.defaultUrl);
    }
  };

  const handleSaveProfile = () => {
    if (!profileName.trim()) return;
    if (!isAuthenticated) {
      guestLoginMutation.mutate({
        name: profileName.trim(),
        avatarColor,
      });
    } else {
      updateProfileMutation.mutate({
        name: profileName.trim(),
        avatarColor,
      });
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "youtube":
        return <Youtube size={15} className="text-[#ff4d4d]" />;
      case "twitch":
        return <Radio size={15} className="text-[#9146FF]" />;
      default:
        return <Film size={15} className="text-amber-400" />;
    }
  };

  return (
    <div className="playora-shell min-h-screen">
      <div className="noise-overlay" />

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-white/[.08] bg-[#0c0e14]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/")}
              className="btn-press flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white"
            >
              <ChevronLeft size={16} /> Home
            </button>
            <span className="h-4 w-px bg-white/10" />
            <span className="text-sm font-extrabold tracking-tight text-white">
              Party Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setJoinOpen(true)}
              variant="outline"
              className="h-9 rounded-xl border-white/10 bg-white/5 text-xs font-bold text-white hover:bg-white/10"
            >
              Join with Code
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-9 rounded-xl bg-[#d6ff3f] px-4 text-xs font-extrabold text-black hover:bg-[#e1ff70]"
            >
              <Plus size={15} className="mr-1.5" /> Create Party
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Active Parties & Room Discovery */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-white md:text-3xl">Active Watch Parties</h1>
                <p className="mt-1 text-xs text-neutral-400">
                  Jump into an ongoing room or start a fresh session with your group.
                </p>
              </div>
              <Button
                onClick={() => refetchRooms()}
                variant="ghost"
                className="h-8 text-[11px] text-neutral-400 hover:text-white"
              >
                Refresh
              </Button>
            </div>

            {loadingRooms ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-40 rounded-2xl border border-white/5 bg-white/[.02] animate-pulse"
                  />
                ))}
              </div>
            ) : !activeRooms || activeRooms.length === 0 ? (
              <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[.02] p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d6ff3f]/10 text-[#d6ff3f]">
                  <Tv size={28} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">No active public parties right now</h3>
                <p className="mt-1 max-w-md text-xs text-neutral-400">
                  Be the host! Create a room, paste a YouTube, Twitch, Kick, or OTT link, and invite your friends.
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="mt-6 h-11 rounded-xl bg-[#d6ff3f] px-6 text-xs font-extrabold text-black hover:bg-[#e1ff70]"
                >
                  <Plus size={15} className="mr-1.5" /> Start First Party
                </Button>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {activeRooms.map((room) => {
                  const meta = PLATFORM_REGISTRY[room.platform as PlatformId] || PLATFORM_REGISTRY.generic;
                  return (
                    <div
                      key={room.id}
                      className="group flex flex-col justify-between rounded-2xl border border-white/[.08] bg-[#12151f]/80 p-5 transition hover:border-[#d6ff3f]/30 hover:bg-[#151926]"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold"
                            style={{
                              backgroundColor: `${meta.brandColor}18`,
                              color: meta.brandColor,
                              border: `1px solid ${meta.brandColor}33`,
                            }}
                          >
                            {getPlatformIcon(room.platform)}
                            {meta.name}
                          </span>
                          <span className="font-mono text-xs font-bold text-neutral-400">
                            {room.code}
                          </span>
                        </div>

                        <h3 className="mt-3 text-base font-bold text-white group-hover:text-[#d6ff3f] transition-colors">
                          {room.title}
                        </h3>
                        <p className="mt-1 line-clamp-1 font-mono text-[10px] text-neutral-500">
                          {room.contentUrl}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3">
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              room.isPlaying ? "bg-[#d6ff3f] animate-pulse" : "bg-neutral-500"
                            }`}
                          />
                          <span>{room.isPlaying ? "Playing" : "Paused"}</span>
                        </div>

                        <Button
                          onClick={() => setLocation(`/party/${room.code}`)}
                          className="h-8 rounded-lg bg-[#d6ff3f] px-3 text-[10px] font-extrabold text-black hover:bg-[#e1ff70]"
                        >
                          Join Party <ArrowRight size={12} className="ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* User Profile & Quick Settings Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-white/[.08] bg-[#11141c] p-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-extrabold text-black shadow-lg"
                  style={{ backgroundColor: avatarColor }}
                >
                  {(user?.name || profileName || "You").substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-extrabold text-white">
                    {user?.name || profileName || "Guest User"}
                  </h3>
                  <p className="text-[10px] text-neutral-400">
                    {isAuthenticated ? "Authenticated Account" : "Guest Profile"}
                  </p>
                </div>
              </div>

              {isEditingProfile ? (
                <div className="mt-4 space-y-3 border-t border-white/5 pt-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-400">
                      Display Name
                    </label>
                    <Input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter your name"
                      className="mt-1 h-9 border-white/10 bg-black/40 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-400">
                      Avatar Color
                    </label>
                    <div className="mt-1.5 flex gap-1.5">
                      {["#D6FF3F", "#FF6B6B", "#8EABE9", "#C47BDE", "#4ECCA3", "#FFA62B"].map(
                        (col) => (
                          <button
                            key={col}
                            onClick={() => setAvatarColor(col)}
                            className={`h-6 w-6 rounded-full border-2 transition ${
                              avatarColor === col ? "border-white scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: col }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={handleSaveProfile}
                      className="h-8 flex-1 rounded-lg bg-[#d6ff3f] text-[10px] font-bold text-black hover:bg-[#e1ff70]"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => setIsEditingProfile(false)}
                      variant="outline"
                      className="h-8 rounded-lg border-white/10 text-[10px] text-neutral-400"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 border-t border-white/5 pt-3">
                  <Button
                    onClick={() => {
                      setProfileName(user?.name || "");
                      setAvatarColor(user?.avatarColor || "#D6FF3F");
                      setIsEditingProfile(true);
                    }}
                    variant="outline"
                    className="h-8 w-full rounded-lg border-white/10 bg-white/[.02] text-[11px] font-semibold text-neutral-300 hover:bg-white/[.05]"
                  >
                    Edit Profile
                  </Button>
                </div>
              )}
            </div>

            {/* Platform Capabilities Overview */}
            <div className="rounded-2xl border border-white/[.08] bg-[#11141c] p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Streaming Support
              </h4>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-white/[.02] p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Youtube size={14} className="text-[#ff4d4d]" />
                    <span className="font-semibold text-white">YouTube & Twitch</span>
                  </div>
                  <span className="rounded bg-[#d6ff3f]/15 px-2 py-0.5 text-[9px] font-bold text-[#d6ff3f]">
                    Automatic Sync
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white/[.02] p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Film size={14} className="text-amber-400" />
                    <span className="font-semibold text-white">Netflix & Prime Video</span>
                  </div>
                  <span className="rounded bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                    Assisted Sync
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white/[.02] p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Radio size={14} className="text-[#53FC18]" />
                    <span className="font-semibold text-white">Kick & Web Streams</span>
                  </div>
                  <span className="rounded bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                    Assisted Sync
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Create Room Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="glass w-full max-w-lg rounded-3xl border border-white/[.12] p-6 shadow-2xl">
            <h2 className="text-xl font-extrabold text-white">Create a Watch Party</h2>
            <p className="mt-1 text-xs text-neutral-400">
              Configure your room and share what you’ll be watching together.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Party Name
                </label>
                <Input
                  value={partyTitle}
                  onChange={(e) => setPartyTitle(e.target.value)}
                  placeholder="e.g. Friday Movie Night"
                  className="mt-1.5 h-11 border-white/10 bg-black/40 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Select Platform
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {PLATFORM_LIST.map((plat) => {
                    const isSelected = selectedPlatform === plat.id;
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => handlePlatformSelect(plat.id)}
                        className={`btn-press flex flex-col items-center justify-center rounded-xl border p-2 text-center transition ${
                          isSelected
                            ? "border-[#d6ff3f] bg-[#d6ff3f]/10 text-white"
                            : "border-white/5 bg-white/[.02] text-neutral-400 hover:border-white/10"
                        }`}
                      >
                        <span className="text-[11px] font-bold">{plat.name}</span>
                        <span
                          className={`mt-0.5 text-[8px] font-semibold ${
                            plat.syncCapability === "automatic"
                              ? "text-[#d6ff3f]"
                              : "text-amber-400"
                          }`}
                        >
                          {plat.syncCapability === "automatic" ? "Auto Sync" : "Assisted"}
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
                  onChange={(e) => setContentUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1.5 h-11 border-white/10 bg-black/40 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[.02] p-3">
                <div>
                  <span className="text-xs font-bold text-white">Host-Only Playback Control</span>
                  <p className="text-[10px] text-neutral-400">
                    Only you can play, pause, or seek the video
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={hostOnlyControls}
                  onChange={(e) => setHostOnlyControls(e.target.checked)}
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
                onClick={handleCreateParty}
                disabled={createPartyMutation.isPending}
                className="h-10 rounded-xl bg-[#d6ff3f] px-5 text-xs font-extrabold text-black hover:bg-[#e1ff70]"
              >
                {createPartyMutation.isPending ? "Creating..." : "Launch Party"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {joinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="glass w-full max-w-md rounded-3xl border border-white/[.12] p-6 shadow-2xl">
            <h2 className="text-xl font-extrabold text-white">Join a Watch Party</h2>
            <p className="mt-1 text-xs text-neutral-400">
              Paste the invite code or complete PlayOra link from your friend.
            </p>

            <div className="mt-5">
              <Input
                autoFocus
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="e.g. 7K4MZ2P9 or playora.app/party/..."
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
                onClick={handleJoinParty}
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
