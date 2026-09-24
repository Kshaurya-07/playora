import React from "react";
import { Mic, MicOff, Volume2, Crown, Shield, Activity, AudioLines } from "lucide-react";
import { RoomMemberPresence } from "@/hooks/useRoomSocket";

interface ParticipantsPanelProps {
  members: RoomMemberPresence[];
  currentUserId: number;
  peerVolumes?: Record<string, number>;
  onVolumeChange?: (peerId: string, volume: number) => void;
  syncHealthPercent?: number;
  isHost?: boolean;
  onKickMember?: (peerId: string) => void;
  onTransferHost?: (peerId: string) => void;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  members,
  currentUserId,
  peerVolumes = {},
  onVolumeChange,
  syncHealthPercent = 98,
  isHost,
  onKickMember,
  onTransferHost,
}) => {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#11141c] p-4">
      <div className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto pr-1">
        {members.map((member) => {
          const isYou = member.userId === currentUserId;
          const initials = member.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
          const currentVol = peerVolumes[member.peerId] ?? 1.0;

          return (
            <div
              key={member.peerId}
              className="group rounded-xl border border-white/5 bg-white/[.02] p-3 transition hover:border-white/10 hover:bg-white/[.04]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar with speaking halo */}
                  <div className="relative">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-black ${
                        member.isSpeaking
                          ? "ring-2 ring-[#d6ff3f] ring-offset-2 ring-offset-[#11141c] animate-pulse"
                          : ""
                      }`}
                      style={{ backgroundColor: member.avatarColor || "#8EABE9" }}
                    >
                      {initials}
                    </div>
                    {member.isSpeaking && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#d6ff3f] text-black shadow">
                        <AudioLines size={10} />
                      </span>
                    )}
                  </div>

                  {/* Name & Role */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{member.name}</span>
                      {isYou && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] font-bold text-neutral-300">
                          YOU
                        </span>
                      )}
                      {member.role === "host" && (
                        <span className="flex items-center gap-0.5 rounded bg-[#d6ff3f]/15 px-1.5 py-0.5 text-[8px] font-bold text-[#d6ff3f]">
                          <Crown size={9} /> HOST
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                      {member.connectionStatus === "reconnecting" ? (
                        <span className="font-semibold text-amber-400 animate-pulse">🟡 Reconnecting...</span>
                      ) : member.isVoiceActive ? (
                        member.isSpeaking ? (
                          <span className="font-bold text-[#d6ff3f]">Speaking...</span>
                        ) : member.isMuted ? (
                          <span className="text-neutral-400">Voice (Muted)</span>
                        ) : (
                          <span className="text-emerald-400">Voice Connected</span>
                        )
                      ) : (
                        <span className="text-neutral-500">Watching (Chat only)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mic & Presence Status */}
                <div className="text-neutral-400">
                  {member.connectionStatus === "reconnecting" ? (
                    <span title="Reconnecting">
                      <Activity size={14} className="text-amber-400 animate-pulse" />
                    </span>
                  ) : member.isVoiceActive ? (
                    member.isMuted ? (
                      <span title="Muted">
                        <MicOff size={14} className="text-amber-400/80" />
                      </span>
                    ) : (
                      <span title="Voice Active">
                        <Mic size={14} className={member.isSpeaking ? "text-[#d6ff3f]" : "text-emerald-400"} />
                      </span>
                    )
                  ) : null}
                </div>
              </div>

              {/* Volume Slider & Host Actions for Other Peers */}
              {!isYou && (
                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                  {onVolumeChange && (
                    <div className="flex items-center gap-2 flex-1">
                      <Volume2 size={12} className="text-neutral-500" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={currentVol}
                        onChange={(e) => onVolumeChange(member.peerId, parseFloat(e.target.value))}
                        className="h-1 flex-1 accent-[#d6ff3f] cursor-pointer"
                      />
                      <span className="font-mono text-[9px] text-neutral-500 w-6 text-right">
                        {Math.round(currentVol * 100)}%
                      </span>
                    </div>
                  )}

                  {isHost && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {onTransferHost && (
                        <button
                          onClick={() => onTransferHost(member.peerId)}
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold text-neutral-400 hover:text-amber-300 hover:bg-amber-400/10 transition"
                          title="Transfer Host"
                        >
                          Host
                        </button>
                      )}
                      {onKickMember && (
                        <button
                          onClick={() => onKickMember(member.peerId)}
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Remove from Party"
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sync Health Card */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300">
            <Activity size={14} className="text-[#d6ff3f]" />
            <span>Room Sync Health</span>
          </div>
          <span className="font-mono text-sm font-extrabold text-[#d6ff3f]">
            {syncHealthPercent}%
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#d6ff3f] transition-all duration-500"
            style={{ width: `${syncHealthPercent}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-neutral-500">
          NTP server clock synchronization active across all devices.
        </p>
      </div>
    </div>
  );
};
