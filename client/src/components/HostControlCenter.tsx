import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Crown,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Sparkles,
  Link,
  Shield,
  Users,
  MicOff,
  UserMinus,
  Check,
  Zap,
  Timer,
} from "lucide-react";
import { resolveStreamingContent, formatTimecode } from "@shared/universal-streaming-engine";
import { RoomMemberPresence } from "@/hooks/useRoomSocket";
import { toast } from "sonner";

interface HostControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  currentPosition: number;
  members: RoomMemberPresence[];
  currentPeerId: string;
  settings: {
    hostOnlyControls: boolean;
    lockSeeking: boolean;
    allowReactions: boolean;
    allowVoice: boolean;
  };
  onTogglePlay: (isPlaying: boolean) => void;
  onSeek: (position: number) => void;
  onForceSyncEveryone: () => void;
  onTriggerCountdown: (seconds?: number) => void;
  onChangeContent: (contentUrl: string, platform?: string, title?: string) => void;
  onUpdateSettings: (settings: any) => void;
  onTransferHost?: (targetPeerId: string) => void;
  onKickMember?: (targetPeerId: string) => void;
}

export const HostControlCenter: React.FC<HostControlCenterProps> = ({
  isOpen,
  onClose,
  isPlaying,
  currentPosition,
  members,
  currentPeerId,
  settings,
  onTogglePlay,
  onSeek,
  onForceSyncEveryone,
  onTriggerCountdown,
  onChangeContent,
  onUpdateSettings,
  onTransferHost,
  onKickMember,
}) => {
  const [newUrl, setNewUrl] = useState("");
  const resolvedNew = newUrl.trim() ? resolveStreamingContent(newUrl.trim()) : null;

  const handleChangeContentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    const res = resolveStreamingContent(newUrl.trim());
    onChangeContent(
      res.normalizedUrl,
      res.platform,
      res.title || `${res.platformName} Stream`
    );
    setNewUrl("");
    toast.success(`Stream updated to ${res.platformName}! Everyone is switching...`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-white/10 bg-[#0d1017] p-6 text-white sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
              <Crown size={18} />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-white">Host Control Center</DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Master playback authority, room settings, and audience management
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Section 1: Master Playback & Synchronization */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[.02] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Master Playback</h3>
            <span className="font-mono text-xs text-[#d6ff3f]">{formatTimecode(currentPosition)}</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Button
              onClick={() => onSeek(Math.max(0, currentPosition - 30))}
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-white/10 bg-white/5 text-[11px] text-white hover:bg-white/10"
            >
              <Rewind size={12} className="mr-1" /> -30s
            </Button>
            <Button
              onClick={() => onSeek(Math.max(0, currentPosition - 10))}
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-white/10 bg-white/5 text-[11px] text-white hover:bg-white/10"
            >
              <Rewind size={12} className="mr-1" /> -10s
            </Button>
            <Button
              onClick={() => onTogglePlay(!isPlaying)}
              size="sm"
              className={`h-8 col-span-2 rounded-lg text-xs font-bold ${
                isPlaying
                  ? "bg-amber-400 text-black hover:bg-amber-300"
                  : "bg-[#d6ff3f] text-black hover:bg-[#e1ff70]"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause size={13} className="mr-1.5 fill-current" /> Pause Everyone
                </>
              ) : (
                <>
                  <Play size={13} className="mr-1.5 fill-current" /> Play Everyone
                </>
              )}
            </Button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            <Button
              onClick={() => onSeek(currentPosition + 10)}
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-white/10 bg-white/5 text-[11px] text-white hover:bg-white/10"
            >
              <FastForward size={12} className="mr-1" /> +10s
            </Button>
            <Button
              onClick={onForceSyncEveryone}
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-[#d6ff3f]/30 bg-[#d6ff3f]/10 text-[11px] font-bold text-[#d6ff3f] hover:bg-[#d6ff3f]/20"
            >
              <Zap size={12} className="mr-1" /> Force Sync
            </Button>
            <Button
              onClick={() => onTriggerCountdown(3)}
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-white/10 bg-white/5 text-[11px] text-white hover:bg-white/10"
            >
              <Timer size={12} className="mr-1" /> 3s Count
            </Button>
          </div>
        </div>

        {/* Section 2: Switch Streaming Content Live */}
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link size={14} className="text-[#d6ff3f]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Change Stream URL</h3>
          </div>
          <form onSubmit={handleChangeContentSubmit} className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Paste YouTube, Twitch, Vimeo, MP4, Netflix, etc."
                className="h-9 rounded-xl border-white/10 bg-white/5 text-xs text-white placeholder:text-neutral-500"
              />
              <Button
                type="submit"
                disabled={!newUrl.trim()}
                className="h-9 shrink-0 rounded-xl bg-[#d6ff3f] px-4 text-xs font-bold text-black hover:bg-[#e1ff70] disabled:opacity-50"
              >
                Switch
              </Button>
            </div>
            {resolvedNew && (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] text-neutral-300">
                <Sparkles size={11} className="text-[#d6ff3f]" />
                <span>Detected:</span>
                <strong className="text-white">{resolvedNew.platformName}</strong>
                <span className="text-neutral-500">•</span>
                <span className="text-[10px] text-neutral-400">{resolvedNew.contentType.toUpperCase()}</span>
              </div>
            )}
          </form>
        </div>

        {/* Section 3: Room Policies */}
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[.02] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Room Permissions</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Host-Only Playback Controls</p>
                <p className="text-[11px] text-neutral-400">Only you can play, pause, or seek</p>
              </div>
              <Switch
                checked={settings.hostOnlyControls}
                onCheckedChange={(checked) =>
                  onUpdateSettings({ ...settings, hostOnlyControls: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
              <div>
                <p className="text-xs font-bold text-white">Allow Live Reactions</p>
                <p className="text-[11px] text-neutral-400">Floating emoji reactions during watch</p>
              </div>
              <Switch
                checked={settings.allowReactions}
                onCheckedChange={(checked) =>
                  onUpdateSettings({ ...settings, allowReactions: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
              <div>
                <p className="text-xs font-bold text-white">Allow WebRTC Voice Chat</p>
                <p className="text-[11px] text-neutral-400">Spatial voice audio mesh</p>
              </div>
              <Switch
                checked={settings.allowVoice}
                onCheckedChange={(checked) =>
                  onUpdateSettings({ ...settings, allowVoice: checked })
                }
              />
            </div>
          </div>
        </div>

        {/* Section 4: Audience Management */}
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[.02] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Participants ({members.length})
            </h3>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {members.map((member) => {
              const isSelf = member.peerId === currentPeerId;
              return (
                <div
                  key={member.peerId}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[.01] p-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                      style={{ backgroundColor: member.avatarColor || "#D6FF3F" }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        {member.name}
                        {member.role === "host" && (
                          <span className="rounded bg-amber-400/20 px-1 py-0.2 text-[9px] font-bold text-amber-400">
                            HOST
                          </span>
                        )}
                        {isSelf && <span className="text-[10px] text-neutral-500">(You)</span>}
                      </p>
                    </div>
                  </div>

                  {!isSelf && (
                    <div className="flex items-center gap-1.5">
                      {onTransferHost && (
                        <Button
                          onClick={() => onTransferHost(member.peerId)}
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] text-neutral-400 hover:text-amber-400"
                          title="Transfer Host"
                        >
                          Make Host
                        </Button>
                      )}
                      {onKickMember && (
                        <button
                          onClick={() => onKickMember(member.peerId)}
                          className="p-1.5 text-neutral-500 hover:text-red-400"
                          title="Remove from Party"
                        >
                          <UserMinus size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={onClose}
            className="h-9 rounded-xl bg-white px-5 text-xs font-bold text-black hover:bg-neutral-200"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
