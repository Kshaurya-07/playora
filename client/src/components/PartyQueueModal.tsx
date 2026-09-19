import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListVideo, Plus, Play, Trash2, ExternalLink, Sparkles } from "lucide-react";
import { resolveStreamingContent } from "@shared/universal-streaming-engine";
import { toast } from "sonner";

export interface QueueItem {
  id: string;
  url: string;
  title: string;
  platform: string;
  platformName: string;
  addedBy: string;
}

interface PartyQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: QueueItem[];
  currentUrl: string;
  isHost: boolean;
  onAddToQueue: (item: Omit<QueueItem, "id">) => void;
  onPlayItem: (item: QueueItem) => void;
  onRemoveItem: (id: string) => void;
  onClearQueue?: () => void;
}

export const PartyQueueModal: React.FC<PartyQueueModalProps> = ({
  isOpen,
  onClose,
  queue,
  currentUrl,
  isHost,
  onAddToQueue,
  onPlayItem,
  onRemoveItem,
  onClearQueue,
}) => {
  const [inputUrl, setInputUrl] = useState("");

  const resolved = inputUrl.trim() ? resolveStreamingContent(inputUrl.trim()) : null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const res = resolveStreamingContent(inputUrl.trim());
    onAddToQueue({
      url: res.normalizedUrl,
      title: res.title || `${res.platformName} Video (${res.contentId || "Stream"})`,
      platform: res.platform,
      platformName: res.platformName,
      addedBy: "Party Member",
    });

    setInputUrl("");
    toast.success("Added to party playlist queue!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-white/10 bg-[#0d1017] p-6 text-white sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6ff3f]/10 text-[#d6ff3f]">
              <ListVideo size={18} />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-white">Party Playlist Queue</DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Queue up videos to automatically play next
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Add to Queue Input */}
        <form onSubmit={handleAdd} className="mt-4 space-y-2">
          <div className="flex gap-2">
            <Input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste YouTube, Twitch, Vimeo, MP4, or OTT URL..."
              className="h-10 rounded-xl border-white/10 bg-white/5 text-xs text-white placeholder:text-neutral-500"
            />
            <Button
              type="submit"
              disabled={!inputUrl.trim()}
              className="h-10 shrink-0 rounded-xl bg-[#d6ff3f] px-4 text-xs font-bold text-black hover:bg-[#e1ff70] disabled:opacity-50"
            >
              <Plus size={14} className="mr-1" /> Add
            </Button>
          </div>

          {resolved && (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-3 py-1.5 text-[11px] text-neutral-300">
              <Sparkles size={12} className="text-[#d6ff3f]" />
              <span>Detected:</span>
              <strong className="text-white">{resolved.platformName}</strong>
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-400 font-mono text-[10px] truncate max-w-[180px]">
                {resolved.contentId}
              </span>
            </div>
          )}
        </form>

        {/* Queue Items List */}
        <div className="mt-4 max-h-60 overflow-y-auto space-y-2 pr-1">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-6 text-center text-neutral-400">
              <ListVideo size={24} className="mb-2 text-neutral-600" />
              <p className="text-xs font-bold text-white">Queue is empty</p>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Add links above to build a continuous watch party playlist.
              </p>
            </div>
          ) : (
            queue.map((item, index) => {
              const isCurrent = item.url === currentUrl;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-xl border p-3 transition ${
                    isCurrent
                      ? "border-[#d6ff3f]/40 bg-[#d6ff3f]/5"
                      : "border-white/[.08] bg-white/[.02] hover:bg-white/[.04]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[11px] font-mono font-bold text-neutral-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white">{item.title}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <span className="text-[#d6ff3f]">{item.platformName}</span>
                        <span>•</span>
                        <span>Added by {item.addedBy}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isHost && (
                      <Button
                        onClick={() => onPlayItem(item)}
                        size="sm"
                        className="h-7 rounded-lg bg-[#d6ff3f] px-2.5 text-[10px] font-bold text-black hover:bg-[#e1ff70]"
                      >
                        <Play size={10} className="mr-1 fill-current" /> Play
                      </Button>
                    )}
                    {(isHost || item.addedBy === "You") && (
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1.5 text-neutral-500 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer controls */}
        <div className="mt-4 flex items-center justify-between border-t border-white/[.08] pt-3 text-xs text-neutral-400">
          <p className="text-[10px]">
            {queue.length} video{queue.length === 1 ? "" : "s"} in playlist
          </p>
          <div className="flex items-center gap-2">
            {isHost && queue.length > 0 && onClearQueue && (
              <Button
                onClick={onClearQueue}
                variant="ghost"
                className="h-8 text-neutral-400 hover:text-red-400 text-xs"
              >
                Clear Queue
              </Button>
            )}
            <Button
              onClick={onClose}
              className="h-8 rounded-xl bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/20"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
