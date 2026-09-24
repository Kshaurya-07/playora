import React, { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
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
  X,
  Sparkles,
  ExternalLink,
  Plus,
  ShieldCheck,
  Radio,
  Tv,
} from "lucide-react";

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  initialTitle?: string;
}

export function CreatePartyModal({
  isOpen,
  onClose,
  initialUrl,
  initialTitle,
}: CreatePartyModalProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const backdropRef = useRef<HTMLDivElement>(null);

  const [partyTitle, setPartyTitle] = useState(initialTitle || "Weekend Watch Party");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>("youtube");
  const [contentUrl, setContentUrl] = useState(
    initialUrl || "https://www.youtube.com/watch?v=M7lc1UVf-VE"
  );
  const [hostOnlyControls, setHostOnlyControls] = useState(true);

  // Sync initial props if changed
  useEffect(() => {
    if (initialUrl) {
      setContentUrl(initialUrl);
      const res = resolveStreamingContent(initialUrl);
      if (res.platform !== "generic") {
        setSelectedPlatform(res.platform);
      }
    }
    if (initialTitle) {
      setPartyTitle(initialTitle);
    }
  }, [initialUrl, initialTitle]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const templates = [
    {
      label: "🎬 Movie Night",
      title: "Friday Movie Night",
      url: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      platform: "youtube" as PlatformId,
    },
    {
      label: "🎮 Gaming Stream",
      title: "Twitch Esports Party",
      url: "https://www.twitch.tv/twitch",
      platform: "twitch" as PlatformId,
    },
    {
      label: "📺 Series Marathon",
      title: "Stranger Things Watch Party",
      url: "https://www.netflix.com/title/80057281",
      platform: "netflix" as PlatformId,
    },
    {
      label: "🎵 Music Chill",
      title: "Lofi Beats Chill Room",
      url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
      platform: "youtube" as PlatformId,
    },
    {
      label: "🔴 Live Kick Stream",
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
      toast.success("Party created successfully!", {
        description: `Room code: ${room.code}`,
      });
      onClose();
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

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-party-title"
    >
      <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl border border-white/[.15] bg-[#0c101a] shadow-2xl flex flex-col max-h-[min(92vh,720px)] overflow-hidden text-white">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 shrink-0 flex items-center justify-between border-b border-white/10 bg-[#0c101a]/95 px-5 py-4 backdrop-blur-md">
          <div>
            <h2 id="create-party-title" className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-[#d6ff3f]" />
              Create a Watch Party
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400">
              Configure your room and share what you'll be streaming together.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin">
          {/* Quick Templates */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Quick Party Presets
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {templates.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => {
                    setPartyTitle(tpl.title);
                    setContentUrl(tpl.url);
                    setSelectedPlatform(tpl.platform);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:border-[#d6ff3f]/40 hover:bg-[#d6ff3f]/10 hover:text-white transition"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Party Name Input */}
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

          {/* Platform Selector Grid */}
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
                    className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition ${
                      isSelected
                        ? "border-[#d6ff3f] bg-[#d6ff3f]/10 text-white shadow-sm shadow-[#d6ff3f]/20"
                        : "border-white/5 bg-white/[.02] text-neutral-400 hover:border-white/10 hover:text-neutral-200"
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
                      {plat.capabilities.syncCapability === "automatic" ? "Auto Sync" : "Assisted"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content URL Input */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Stream / Video URL
            </label>
            <Input
              value={contentUrl}
              onChange={(e) => handleContentUrlChange(e.target.value)}
              placeholder="Paste YouTube, Twitch, Vimeo, MP4, Netflix, Prime, etc."
              className="mt-1.5 h-11 border-white/10 bg-black/40 text-xs text-white font-mono"
            />
            {resolvedPreview && resolvedPreview.platform !== "generic" && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#d6ff3f]/20 bg-[#d6ff3f]/5 px-3 py-1.5 text-[11px] text-neutral-300">
                <Sparkles size={12} className="text-[#d6ff3f] shrink-0" />
                <span>Detected:</span>
                <strong className="text-white">{resolvedPreview.platformName}</strong>
                <span className="text-neutral-500">•</span>
                <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-bold text-[#d6ff3f]">
                  {resolvedPreview.capabilities.syncCapability === "automatic"
                    ? "Automatic Sync"
                    : "Companion Assisted Sync"}
                </span>
              </div>
            )}
          </div>

          {/* Host Only Controls Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[.02] p-3">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#d6ff3f]" />
                Host-Only Playback Control
              </span>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Only the party host can play, pause, or seek the stream.
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

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-10 shrink-0 flex items-center justify-between gap-3 border-t border-white/10 bg-[#0c101a]/95 px-5 py-3.5 backdrop-blur-md">
          <Link
            href="/party/create"
            onClick={onClose}
            className="text-[11px] text-neutral-400 hover:text-[#d6ff3f] flex items-center gap-1 transition"
          >
            <span>Full Page Mode</span>
            <ExternalLink size={12} />
          </Link>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="h-9 rounded-xl border-white/10 text-xs font-bold text-neutral-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateParty}
              disabled={createPartyMutation.isPending}
              className="h-9 rounded-xl bg-[#d6ff3f] px-5 text-xs font-extrabold text-black hover:bg-[#e1ff70] shadow-md shadow-[#d6ff3f]/15"
            >
              {createPartyMutation.isPending ? "Creating..." : "Launch Party"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
