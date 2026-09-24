import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import {
  PLATFORM_LIST,
  PlatformId,
  PLATFORM_REGISTRY,
  detectPlatform,
  resolveStreamingContent,
} from "@shared/watch-party";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CreatePartyModal } from "@/components/CreatePartyModal";
import { JoinPartyModal } from "@/components/JoinPartyModal";
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
  Activity,
  History as HistoryIcon,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, refresh } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");

  // Check URL parameters for re-launching from history
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get("url");
    const titleParam = params.get("title");
    if (urlParam) {
      setContentUrl(urlParam);
      const res = resolveStreamingContent(urlParam);
      if (res.platform !== "generic") {
        setSelectedPlatform(res.platform);
      }
      if (titleParam) {
        setPartyTitle(titleParam);
      }
      setCreateOpen(true);
    }
  }, []);

  // Create form state
  const [partyTitle, setPartyTitle] = useState("Weekend Movie Night");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>("youtube");
  const [contentUrl, setContentUrl] = useState("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  const [hostOnlyControls, setHostOnlyControls] = useState(true);

  const templates = [
    { label: "🎬 Movie Night", title: "Friday Movie Night", url: "https://www.youtube.com/watch?v=M7lc1UVf-VE", platform: "youtube" as PlatformId },
    { label: "🎮 Gaming Stream", title: "Twitch Esports Party", url: "https://www.twitch.tv/twitch", platform: "twitch" as PlatformId },
    { label: "📺 Series Marathon", title: "Stranger Things Watch Party", url: "https://www.netflix.com/title/80057281", platform: "netflix" as PlatformId },
    { label: "🎵 Music Chill", title: "Lofi Beats Chill Room", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk", platform: "youtube" as PlatformId },
    { label: "🔴 Live Kick Stream", title: "Kick Live Community", url: "https://kick.com/xqc", platform: "kick" as PlatformId },
  ];

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

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || "");
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || "#D6FF3F");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Fetch active rooms & history from backend
  const { data: activeRooms, isLoading: loadingRooms, refetch: refetchRooms } =
    trpc.party.listActive.useQuery(undefined, { refetchInterval: 10000 });

  const { data: historyRooms, isLoading: loadingHistory } =
    trpc.party.listHistory.useQuery(undefined, { refetchInterval: 30000 });

  const { data: userStats } = trpc.auth.getStats.useQuery(undefined, {
    enabled: Boolean(user?.id),
  });

  // Mutations
  const createPartyMutation = trpc.party.create.useMutation({
    onSuccess: (room) => {
      toast.success("Party created successfully!", {
        description: `Room code: ${room.code}`,
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
        toast.error(rawMsg || "Failed to create party");
      }
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
    <div className="playora-shell min-h-screen pb-20 md:pb-10">
      <div className="noise-overlay" />
      <Navbar />

      {/* Sub-header Quick Actions Bar */}
      <div className="border-b border-white/5 bg-[#0a0d14]/50 backdrop-blur-sm relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
              <Sparkles size={15} className="text-[#d6ff3f]" />
              Watch Party Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setJoinOpen(true)}
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-white/10 bg-white/5 text-xs font-semibold text-white hover:bg-white/10"
            >
              Join with Code
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              size="sm"
              className="h-8 rounded-lg bg-[#d6ff3f] px-3.5 text-xs font-extrabold text-black hover:bg-[#e1ff70]"
            >
              <Plus size={15} className="mr-1" /> Create Party
            </Button>
          </div>
        </div>
      </div>

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
                          <div className="flex items-center gap-1.5">
                            {room.userJoinedBefore && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#d6ff3f]/15 border border-[#d6ff3f]/30 px-2 py-0.5 text-[9px] font-bold text-[#d6ff3f]">
                                <RotateCcw size={10} /> Rejoin
                              </span>
                            )}
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
                          </div>
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
                          className={`h-8 rounded-lg px-3 text-[10px] font-extrabold ${
                            room.userJoinedBefore
                              ? "bg-[#d6ff3f] text-black hover:bg-[#e1ff70] shadow-md shadow-[#d6ff3f]/25 ring-1 ring-[#d6ff3f]"
                              : "bg-white/10 text-white hover:bg-[#d6ff3f] hover:text-black"
                          }`}
                        >
                          {room.userJoinedBefore ? "Rejoin Party" : "Join Party"}{" "}
                          <ArrowRight size={12} className="ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Concluded Watch Party History Section */}
            <div className="mt-10 pt-8 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <HistoryIcon size={20} className="text-[#d6ff3f]" />
                    Watch Party History
                  </h2>
                  <p className="mt-1 text-xs text-neutral-400">
                    Concluded party sessions. Re-launch anytime with the original video link.
                  </p>
                </div>
                <Link
                  href="/history"
                  className="text-xs font-semibold text-[#d6ff3f] hover:underline flex items-center gap-1"
                >
                  <span>View Full History</span>
                  <ExternalLink size={13} />
                </Link>
              </div>

              {loadingHistory ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[1, 2].map((n) => (
                    <div key={n} className="h-24 rounded-2xl border border-white/5 bg-white/[.02] animate-pulse" />
                  ))}
                </div>
              ) : historyRooms && historyRooms.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {historyRooms.slice(0, 4).map((room) => (
                    <div
                      key={room.id}
                      className="rounded-2xl border border-white/10 bg-[#12151f]/60 p-4 flex items-center justify-between hover:border-white/20 transition"
                    >
                      <div className="space-y-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/15 border border-red-500/20 text-red-400">
                            ENDED
                          </span>
                          <span className="text-[10px] font-bold uppercase text-zinc-400">
                            {room.platform}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white truncate">{room.title}</h4>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          Code: {room.code}
                          {room.endedAt && (
                            <span> • {new Date(room.endedAt).toLocaleDateString()}</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/party/${room.code}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-white/15 text-xs text-zinc-300 hover:text-white"
                          >
                            Recap
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.01] p-6 text-center text-xs text-zinc-500">
                  No concluded parties recorded yet. When a host ends a room, it appears here.
                </div>
              )}
            </div>
          </section>

          {/* User Profile & Quick Settings Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-white/[.08] bg-[#11141c] p-5 space-y-4">
              <div className="flex items-center gap-3">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || "User"}
                    className="h-12 w-12 rounded-2xl object-cover ring-2 ring-[#d6ff3f]/50 shadow-lg"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-extrabold text-black shadow-lg"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {(user?.name || profileName || "You").substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="truncate text-sm font-extrabold text-white">
                      {user?.name || profileName || "Guest User"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {user?.loginMethod === "google" || Boolean(user?.googleId) ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#4285F4]/20 text-[#8ab4f8] text-[10px] font-semibold">
                        <ShieldCheck size={11} /> Google Account
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400">
                        Guest Session
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-center">
                <div className="rounded-xl bg-white/[0.02] p-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Hosted</span>
                  <p className="text-base font-extrabold text-white">{userStats?.hostedCount ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/[0.02] p-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Joined</span>
                  <p className="text-base font-extrabold text-white">{userStats?.joinedCount ?? 0}</p>
                </div>
              </div>

              <div className="pt-1 space-y-2">
                <Link href="/profile" className="block">
                  <Button
                    variant="outline"
                    className="h-9 w-full rounded-xl border-white/10 bg-white/[0.04] text-xs font-semibold text-white hover:bg-white/[0.08]"
                  >
                    Manage Profile & Stats
                  </Button>
                </Link>

                {!isAuthenticated && (
                  <Link href="/login" className="block">
                    <Button
                      size="sm"
                      className="h-9 w-full rounded-xl bg-[#d6ff3f] text-[#0a0d14] font-bold text-xs hover:bg-[#c2ea32]"
                    >
                      Sign in with Google
                    </Button>
                  </Link>
                )}
              </div>
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
      <CreatePartyModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        initialUrl={contentUrl}
        initialTitle={partyTitle}
      />

      {/* Join Room Modal */}
      <JoinPartyModal
        isOpen={joinOpen}
        onClose={() => setJoinOpen(false)}
      />
    </div>
  );
}
