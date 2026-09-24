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
} from "lucide-react";

export default function CreatePartyPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [partyTitle, setPartyTitle] = useState("Weekend Watch Party");
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
    },
    {
      label: "🎮 Twitch Esports Live",
      title: "Twitch Esports Party",
      url: "https://www.twitch.tv/twitch",
      platform: "twitch" as PlatformId,
    },
    {
      label: "📺 Netflix Series Binge",
      title: "Stranger Things Watch Party",
      url: "https://www.netflix.com/title/80057281",
      platform: "netflix" as PlatformId,
    },
    {
      label: "🎵 Lofi Chill & Study",
      title: "Lofi Beats Chill Room",
      url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
      platform: "youtube" as PlatformId,
    },
    {
      label: "🔴 Kick Creator Stream",
      title: "Kick Live Community",
      url: "https://kick.com/xqc",
      platform: "kick" as PlatformId,
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
      hostName: user?.name || "Party Host",
      settings: {
        hostOnlyControls,
        lockSeeking: false,
        allowReactions: true,
        allowVoice: true,
        isPublic: true,
      },
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
            Choose your video, customize permissions, and invite friends for real-time synchronized playback.
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
              Party Name
            </label>
            <Input
              value={partyTitle}
              onChange={(e) => setPartyTitle(e.target.value)}
              placeholder="e.g. Friday Movie Night"
              className="mt-2 h-12 border-white/10 bg-black/40 text-sm text-white"
            />
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
              Stream or Video URL
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
