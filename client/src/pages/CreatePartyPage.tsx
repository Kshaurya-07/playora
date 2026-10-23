import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
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
  Sparkles,
  ChevronLeft,
  ShieldCheck,
  Plus,
  Tv,
  Film,
  Radio,
  Youtube,
  ArrowRight,
  Lock,
  Globe,
  Users,
} from "lucide-react";

const CATEGORY_OPTIONS = [
  { id: "general", label: "General" },
  { id: "movies", label: "Movies" },
  { id: "series", label: "Series" },
  { id: "anime", label: "Anime" },
  { id: "gaming", label: "Gaming" },
  { id: "music", label: "Music" },
  { id: "sports", label: "Sports" },
  { id: "watchalong", label: "Watch Along" },
  { id: "tech", label: "Tech & Talks" },
  { id: "hangout", label: "Chill Hangout" },
  { id: "podcasts", label: "Podcasts" },
  { id: "comedy", label: "Comedy" },
];

export default function CreatePartyPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [partyTitle, setPartyTitle] = useState("Weekend Watch Party");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [privacyMode, setPrivacyMode] = useState<"public" | "friends" | "invite_only">("public");
  const [accessMode, setAccessMode] = useState<"open" | "password" | "host_approval">("open");
  const [password, setPassword] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>("youtube");
  const [contentUrl, setContentUrl] = useState(
    "https://www.youtube.com/watch?v=M7lc1UVf-VE"
  );
  const [hostOnlyControls, setHostOnlyControls] = useState(true);

  const templates = [
    {
      label: "🎬 Friday Movie Night",
      title: "Friday Movie Night",
      url: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      platform: "youtube" as PlatformId,
      cat: "movies",
    },
    {
      label: "🎮 Twitch Esports Live",
      title: "Twitch Esports Party",
      url: "https://www.twitch.tv/twitch",
      platform: "twitch" as PlatformId,
      cat: "gaming",
    },
    {
      label: "📺 Netflix Series Binge",
      title: "Stranger Things Watch Party",
      url: "https://www.netflix.com/title/80057281",
      platform: "netflix" as PlatformId,
      cat: "series",
    },
    {
      label: "🎵 Lofi Chill & Study",
      title: "Lofi Beats Chill Room",
      url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
      platform: "youtube" as PlatformId,
      cat: "music",
    },
    {
      label: "🔴 Kick Creator Stream",
      title: "Kick Live Community",
      url: "https://kick.com/xqc",
      platform: "kick" as PlatformId,
      cat: "gaming",
    },
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

  const handlePlatformSelect = (id: PlatformId) => {
    setSelectedPlatform(id);
    const meta = PLATFORM_REGISTRY[id];
    if (meta && (!contentUrl || contentUrl.includes("youtube.com"))) {
      setContentUrl(meta.defaultUrl);
    }
  };

  const createPartyMutation = trpc.party.create.useMutation({
    onSuccess: (room) => {
      toast.success("Watch party created successfully!", {
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

  const handleCreateParty = () => {
    if (!partyTitle.trim()) {
      toast.error("Please enter a party name");
      return;
    }
    if (!contentUrl.trim()) {
      toast.error("Please enter a content URL");
      return;
    }
    if (accessMode === "password" && !password.trim()) {
      toast.error("Please set a room password or choose Open access");
      return;
    }

    createPartyMutation.mutate({
      title: partyTitle.trim(),
      description: description.trim() || undefined,
      category,
      privacyMode,
      accessMode,
      password: accessMode === "password" ? password.trim() : undefined,
      platform: selectedPlatform,
      contentUrl: contentUrl.trim(),
      hostOnlyPlayback: hostOnlyControls,
      maxParticipants,
    });
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col pb-20 md:pb-10">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition mb-3"
          >
            <ChevronLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#d6ff3f] animate-ping" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Launch a Watch Party
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Choose your video, customize access modes, and invite friends for real-time synchronized playback.
          </p>
        </div>

        {/* Main Creation Card */}
        <div className="rounded-3xl border border-white/10 bg-[#0d111b]/80 p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
          {/* Presets */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Popular Presets
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => {
                    setPartyTitle(tpl.title);
                    setContentUrl(tpl.url);
                    setSelectedPlatform(tpl.platform);
                    if (tpl.cat) setCategory(tpl.cat);
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:border-[#d6ff3f]/50 hover:bg-[#d6ff3f]/10 hover:text-white transition"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Party Title */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Party Name *
            </label>
            <Input
              value={partyTitle}
              onChange={(e) => setPartyTitle(e.target.value)}
              placeholder="e.g. Friday Movie Night"
              className="mt-2 h-12 border-white/10 bg-black/40 text-sm text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Party Description (Optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short bio or description for discovery..."
              className="mt-2 h-10 border-white/10 bg-black/40 text-xs text-white"
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Category
            </label>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-center ${
                    category === c.id
                      ? "bg-[#d6ff3f] text-[#050505] border-[#d6ff3f]"
                      : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform Grid */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Supported Platforms
            </label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PLATFORM_LIST.map((plat) => {
                const isSelected = selectedPlatform === plat.id;
                return (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={() => handlePlatformSelect(plat.id)}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                      isSelected
                        ? "border-[#d6ff3f] bg-[#d6ff3f]/10 text-white shadow-lg shadow-[#d6ff3f]/10"
                        : "border-white/5 bg-white/[.02] text-neutral-400 hover:border-white/10 hover:text-neutral-200"
                    }`}
                  >
                    <span className="text-xs font-bold">{plat.name}</span>
                    <span
                      className={`mt-1 text-[9px] font-semibold ${
                        plat.capabilities.syncCapability === "automatic"
                          ? "text-[#d6ff3f]"
                          : "text-amber-400"
                      }`}
                    >
                      {plat.capabilities.syncCapability === "automatic" ? "Auto Sync" : "Companion Sync"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content URL */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Stream or Video URL *
            </label>
            <Input
              value={contentUrl}
              onChange={(e) => handleContentUrlChange(e.target.value)}
              placeholder="Paste YouTube, Twitch, Vimeo, MP4, Netflix, Prime Video, etc."
              className="mt-2 h-12 border-white/10 bg-black/40 text-sm text-white font-mono"
            />
            {resolvedPreview && resolvedPreview.platform !== "generic" && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#d6ff3f]/20 bg-[#d6ff3f]/5 px-3 py-2 text-xs text-neutral-300">
                <Sparkles size={14} className="text-[#d6ff3f] shrink-0" />
                <span>Detected Platform:</span>
                <strong className="text-white">{resolvedPreview.platformName}</strong>
                <span className="text-neutral-500">•</span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[#d6ff3f]">
                  {resolvedPreview.capabilities.syncCapability === "automatic"
                    ? "Automatic Synchronization"
                    : "Companion Assisted Sync"}
                </span>
              </div>
            )}
          </div>

          {/* Privacy & Access Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Privacy Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Globe size={14} /> Privacy Visibility
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setPrivacyMode("public")}
                  className={`py-2 text-xs rounded-lg font-semibold transition ${
                    privacyMode === "public" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacyMode("friends")}
                  className={`py-2 text-xs rounded-lg font-semibold transition ${
                    privacyMode === "friends" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Friends
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacyMode("invite_only")}
                  className={`py-2 text-xs rounded-lg font-semibold transition ${
                    privacyMode === "invite_only" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Invite
                </button>
              </div>
            </div>

            {/* Access Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Lock size={14} /> Entry Policy
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setAccessMode("open")}
                  className={`py-2 text-xs rounded-lg font-semibold transition ${
                    accessMode === "open" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => setAccessMode("password")}
                  className={`py-2 text-xs rounded-lg font-semibold transition ${
                    accessMode === "password" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setAccessMode("host_approval")}
                  className={`py-2 text-xs rounded-lg font-semibold transition ${
                    accessMode === "host_approval" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Approval
                </button>
              </div>
            </div>
          </div>

          {/* Conditional Password Input */}
          {accessMode === "password" && (
            <div className="animate-in fade-in duration-150 space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Lock size={12} />
                Set Room Password *
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to enter this party..."
                className="h-11 border-amber-500/30 bg-amber-500/5 text-xs text-white"
              />
            </div>
          )}

          {/* Host Controls Permission */}
          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[.02] p-4">
            <div>
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#d6ff3f]" />
                Host-Only Playback Controls
              </span>
              <p className="text-xs text-neutral-400 mt-0.5">
                When enabled, only the host can play, pause, or seek. Participants stay locked in sync.
              </p>
            </div>
            <input
              type="checkbox"
              checked={hostOnlyControls}
              onChange={(e) => setHostOnlyControls(e.target.checked)}
              className="h-5 w-5 accent-[#d6ff3f] cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="h-11 rounded-xl border-white/10 text-xs font-bold text-neutral-300 hover:text-white"
              >
                Cancel
              </Button>
            </Link>
            <Button
              onClick={handleCreateParty}
              disabled={createPartyMutation.isPending}
              className="h-11 rounded-xl bg-[#d6ff3f] hover:bg-[#c2ea32] text-[#0a0d14] px-6 font-extrabold text-sm shadow-lg shadow-[#d6ff3f]/20"
            >
              {createPartyMutation.isPending ? "Creating..." : "Launch Watch Party"}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
