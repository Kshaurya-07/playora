import React, { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  PLATFORM_REGISTRY,
  PlatformId,
  getYouTubeVideoId,
  isYouTubeLiveUrl,
  getTwitchTarget,
  getKickChannel,
  formatTimecode,
} from "@shared/watch-party";
import { useRoomSocket } from "@/hooks/useRoomSocket";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { YouTubeAdapter } from "@/components/adapters/YouTubeAdapter";
import { TwitchAdapter } from "@/components/adapters/TwitchAdapter";
import { KickAdapter } from "@/components/adapters/KickAdapter";
import { AssistedSyncAdapter } from "@/components/adapters/AssistedSyncAdapter";
import { ChatPanel } from "@/components/ChatPanel";
import { ParticipantsPanel } from "@/components/ParticipantsPanel";
import { ReactionsOverlay } from "@/components/ReactionsOverlay";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { CountdownModal } from "@/components/CountdownModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Waves,
  Share2,
  Settings2,
  Users,
  MessageCircle,
  Mic,
  MicOff,
  ChevronLeft,
  Copy,
  X,
  Play,
  Pause,
  Volume2,
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface WatchRoomPageProps {
  code: string;
}

export const WatchRoomPage: React.FC<WatchRoomPageProps> = ({ code }) => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const cleanCode = code.trim().toUpperCase();

  // Fetch room data from server
  const { data: room, isLoading, error } = trpc.party.get.useQuery(
    { code: cleanCode },
    {
      retry: 2,
      refetchOnWindowFocus: false,
    }
  );

  // Local state
  const [activeTab, setActiveTab] = useState<"chat" | "people">("chat");
  const [mobilePanel, setMobilePanel] = useState<"none" | "chat" | "people">("none");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [countdownState, setCountdownState] = useState<{ count: number; message: string }>({
    count: 0,
    message: "",
  });

  // Local player state
  const [localPlayerPos, setLocalPlayerPos] = useState(0);
  const [targetSeekPos, setTargetSeekPos] = useState(0);

  // Current user info for socket
  const socketUser = useMemo(
    () => ({
      id: user?.id || 9999,
      name: user?.name || "Guest " + cleanCode.slice(0, 4),
      avatarColor: user?.avatarColor || "#D6FF3F",
    }),
    [user, cleanCode]
  );

  // WebSocket real-time connection
  const {
    connected,
    peerId,
    role,
    members,
    messages,
    activeReaction,
    roomPlayback,
    latencyMs,
    localDrift,
    driftStatus,
    calculateDrift,
    broadcastPlayback,
    sendChatMessage,
    deleteChatMessage,
    sendReaction,
    triggerCountdown,
    updateVoiceState,
    sendVoiceSignal,
  } = useRoomSocket({
    roomCode: cleanCode,
    user: socketUser,
    platform: room?.platform,
    contentUrl: room?.contentUrl,
    onPlaybackSync: (state) => {
      setTargetSeekPos(state.position);
    },
    onVoiceSignal: (senderPeerId, senderName, signal) => {
      voiceChat.handleVoiceSignal(senderPeerId, senderName, signal);
    },
    onCountdownTick: (count, message) => {
      setCountdownState({ count, message });
    },
  });

  const isHost = role === "host" || room?.hostId === socketUser.id;
  const canControl = isHost || !room?.settings?.hostOnlyControls;

  // WebRTC Voice Chat Hook
  const voiceChat = useVoiceChat({
    myPeerId: peerId,
    activeMembers: members,
    sendSignal: sendVoiceSignal,
    onSpeakingChange: (isSpeaking) => {
      updateVoiceState(voiceChat.muted, isSpeaking);
    },
  });

  // Update local position and calculate drift against authoritative room clock
  const handlePositionUpdate = useCallback(
    (pos: number) => {
      setLocalPlayerPos(pos);
      calculateDrift(pos);
    },
    [calculateDrift]
  );

  // When host or controller changes playback state locally
  const handleLocalPlaybackChange = useCallback(
    (newIsPlaying: boolean, pos: number) => {
      if (!canControl) {
        toast.info("Playback is controlled by the host.");
        return;
      }
      broadcastPlayback(newIsPlaying ? "play" : "pause", pos);
    },
    [canControl, broadcastPlayback]
  );

  // Manual "Sync now" action
  const handleSyncNow = useCallback(() => {
    const { projectedPos } = calculateDrift(localPlayerPos);
    setTargetSeekPos(projectedPos);
    toast.success("Synchronized with room timeline", {
      description: `Aligned to ${formatTimecode(projectedPos)}`,
    });
  }, [calculateDrift, localPlayerPos]);

  // Copy room link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/party/${cleanCode}`;
    navigator.clipboard?.writeText(url);
    toast.success("Party link copied to clipboard!");
  };

  if (isLoading) {
    return (
      <div className="playora-shell flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d6ff3f]/10 text-[#d6ff3f] animate-pulse">
          <Waves size={24} />
        </div>
        <p className="mt-4 text-sm font-bold text-white">Connecting to Watch Party {cleanCode}...</p>
        <p className="mt-1 text-xs text-neutral-400">Synchronizing room state and media player</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="playora-shell flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <AlertCircle size={28} />
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-white">Party Not Found</h2>
        <p className="mt-2 max-w-sm text-xs text-neutral-400">
          The room code <strong className="text-white">{cleanCode}</strong> does not exist or has expired.
        </p>
        <Button
          onClick={() => setLocation("/dashboard")}
          className="mt-6 h-10 rounded-xl bg-[#d6ff3f] px-5 text-xs font-bold text-black hover:bg-[#e1ff70]"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  // Identify platform and URL IDs
  const platformId = (room.platform.toLowerCase() as PlatformId) || "generic";
  const platformMeta = PLATFORM_REGISTRY[platformId] || PLATFORM_REGISTRY.generic;
  const youtubeVideoId = platformId === "youtube" ? getYouTubeVideoId(room.contentUrl) : null;
  const twitchTarget = platformId === "twitch" ? getTwitchTarget(room.contentUrl) : null;
  const kickChannel = platformId === "kick" ? getKickChannel(room.contentUrl) : null;

  return (
    <div className="playora-shell flex min-h-screen flex-col overflow-hidden">
      <div className="noise-overlay" />

      {/* Synchronized 3-2-1 Countdown Overlay */}
      <CountdownModal count={countdownState.count} message={countdownState.message} />

      {/* Floating Reactions Canvas/Particle Overlay */}
      <ReactionsOverlay activeReaction={activeReaction} />

      {/* Top Navigation Bar */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/[.08] bg-[#0c0e15]/90 px-4 backdrop-blur-xl lg:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/dashboard")}
            className="btn-press flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <span className="hidden h-5 w-px bg-white/10 sm:block" />

          <div className="flex items-center gap-2">
            <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-[#d6ff3f] text-black">
              <Waves size={16} />
            </div>
            <div>
              <h1 className="max-w-[200px] truncate text-xs font-black text-white sm:max-w-xs">
                {room.title}
              </h1>
              <div className="flex items-center gap-2 text-[9px] text-neutral-400">
                <span className="font-mono font-bold text-[#d6ff3f]">{cleanCode}</span>
                <span>•</span>
                <span>{platformMeta.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Right Status & Controls */}
        <div className="flex items-center gap-2.5">
          <SyncStatusIndicator
            status={driftStatus}
            driftSeconds={localDrift}
            latencyMs={latencyMs}
            onSyncNow={handleSyncNow}
            showSyncButton={platformMeta.syncCapability === "automatic"}
          />

          <Button
            onClick={() => setShowInviteModal(true)}
            variant="outline"
            className="h-8 rounded-lg border-white/10 bg-white/5 px-2.5 text-xs font-bold text-white hover:bg-white/10"
          >
            <Share2 size={13} className="mr-1.5" />
            <span className="hidden sm:inline">Invite</span>
          </Button>
        </div>
      </header>

      {/* Main Room Split View: Video Surface on Left, Social Panel on Right */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-3 p-3 lg:grid lg:grid-cols-[1fr_360px] lg:p-4">
        {/* Left: Video Player Surface */}
        <section className="flex flex-col min-w-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
            {platformId === "youtube" && youtubeVideoId ? (
              <YouTubeAdapter
                videoId={youtubeVideoId}
                isLive={isYouTubeLiveUrl(room.contentUrl)}
                isHost={isHost}
                canControl={canControl}
                isPlaying={roomPlayback.isPlaying}
                targetPosition={targetSeekPos || roomPlayback.currentPosition}
                onPositionUpdate={handlePositionUpdate}
                onLocalPlaybackChange={handleLocalPlaybackChange}
              />
            ) : platformId === "twitch" && twitchTarget ? (
              <TwitchAdapter
                target={twitchTarget}
                isHost={isHost}
                canControl={canControl}
                isPlaying={roomPlayback.isPlaying}
                targetPosition={targetSeekPos || roomPlayback.currentPosition}
                onPositionUpdate={handlePositionUpdate}
                onLocalPlaybackChange={handleLocalPlaybackChange}
              />
            ) : platformId === "kick" && kickChannel ? (
              <KickAdapter
                channel={kickChannel}
                isHost={isHost}
                isPlaying={roomPlayback.isPlaying}
                onTriggerCountdown={() => triggerCountdown(3)}
              />
            ) : (
              <AssistedSyncAdapter
                platform={platformMeta}
                contentUrl={room.contentUrl}
                roomTitle={room.title}
                isHost={isHost}
                isPlaying={roomPlayback.isPlaying}
                currentPosition={localPlayerPos || roomPlayback.currentPosition}
                onTogglePlayback={() =>
                  handleLocalPlaybackChange(!roomPlayback.isPlaying, localPlayerPos)
                }
                onTriggerCountdown={() => triggerCountdown(3)}
              />
            )}
          </div>

          {/* Quick Playback Bar & Floating Reactions for Mobile */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[.08] bg-[#11141c] p-2.5">
            <div className="flex items-center gap-2">
              {canControl && (
                <Button
                  onClick={() =>
                    handleLocalPlaybackChange(!roomPlayback.isPlaying, localPlayerPos)
                  }
                  className={`h-8 rounded-lg px-3 text-xs font-bold ${
                    roomPlayback.isPlaying
                      ? "bg-amber-500 text-black hover:bg-amber-400"
                      : "bg-[#d6ff3f] text-black hover:bg-[#e1ff70]"
                  }`}
                >
                  {roomPlayback.isPlaying ? (
                    <>
                      <Pause size={13} className="mr-1 fill-current" /> Pause
                    </>
                  ) : (
                    <>
                      <Play size={13} className="mr-1 fill-current" /> Play
                    </>
                  )}
                </Button>
              )}

              {isHost && (
                <Button
                  onClick={() => triggerCountdown(3)}
                  variant="outline"
                  className="h-8 rounded-lg border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-white hover:bg-white/10"
                >
                  3-2-1 Countdown
                </Button>
              )}
            </div>

            {/* Quick Reactions Bar */}
            <div className="flex items-center gap-1">
              {["❤️", "😂", "🔥", "👏", "🍿"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="btn-press rounded-md px-1.5 py-1 text-sm hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
            <button
              onClick={() => setMobilePanel("chat")}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold ${
                mobilePanel === "chat"
                  ? "border-[#d6ff3f]/30 bg-[#d6ff3f]/10 text-[#d6ff3f]"
                  : "border-white/10 bg-white/5 text-neutral-400"
              }`}
            >
              <MessageCircle size={15} /> Chat
            </button>
            <button
              onClick={() => setMobilePanel("people")}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold ${
                mobilePanel === "people"
                  ? "border-[#d6ff3f]/30 bg-[#d6ff3f]/10 text-[#d6ff3f]"
                  : "border-white/10 bg-white/5 text-neutral-400"
              }`}
            >
              <Users size={15} /> People ({members.length})
            </button>
          </div>
        </section>

        {/* Right: Sidebar Tabs (Chat & People) */}
        <aside
          className={`mobile-bottom-sheet ${
            mobilePanel === "none" ? "hidden" : "fixed inset-x-0 bottom-0 z-40 max-h-[85vh]"
          } flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11141c] lg:relative lg:flex`}
        >
          {/* Sidebar Tab Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/[.08] px-4 py-2.5">
            <div className="flex gap-1 rounded-lg bg-white/[.04] p-1">
              <button
                onClick={() => setActiveTab("chat")}
                className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                  activeTab === "chat" ? "bg-white/10 text-white" : "text-neutral-400"
                }`}
              >
                <MessageCircle size={13} className="mr-1.5 inline" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab("people")}
                className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                  activeTab === "people" ? "bg-white/10 text-white" : "text-neutral-400"
                }`}
              >
                <Users size={13} className="mr-1.5 inline" />
                People ({members.length})
              </button>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobilePanel("none")}
              className="text-neutral-400 hover:text-white sm:hidden"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "chat" ? (
              <ChatPanel
                messages={messages}
                currentUser={socketUser}
                isHost={isHost}
                onSendMessage={sendChatMessage}
                onDeleteMessage={deleteChatMessage}
                onSendReaction={sendReaction}
              />
            ) : (
              <ParticipantsPanel
                members={members}
                currentUserId={socketUser.id}
                peerVolumes={voiceChat.peerVolumes}
                onVolumeChange={voiceChat.setPeerVolume}
              />
            )}
          </div>

          {/* Voice Chat Footer Controls */}
          <div className="flex shrink-0 items-center justify-between border-t border-white/[.08] bg-[#0c0e14] px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  if (voiceChat.joined) {
                    voiceChat.leaveVoice();
                  } else {
                    voiceChat.joinVoice();
                  }
                }}
                className={`h-8 rounded-lg px-3 text-xs font-bold ${
                  voiceChat.joined
                    ? "bg-[#d6ff3f] text-black hover:bg-[#e1ff70]"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                <Mic size={13} className="mr-1.5" />
                {voiceChat.joined ? "Voice Connected" : "Join Voice"}
              </Button>

              {voiceChat.joined && (
                <button
                  onClick={voiceChat.toggleMute}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                    voiceChat.muted
                      ? "border-red-500/30 bg-red-500/10 text-red-400"
                      : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"
                  }`}
                  title={voiceChat.muted ? "Unmute microphone" : "Mute microphone"}
                >
                  {voiceChat.muted ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              )}
            </div>

            <button
              onClick={() => setLocation("/dashboard")}
              className="text-[10px] font-semibold text-neutral-400 hover:text-red-400 transition"
            >
              Leave Room
            </button>
          </div>
        </aside>
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="glass w-full max-w-md rounded-3xl border border-white/[.12] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#d6ff3f]">
                  Party Invite
                </span>
                <h3 className="mt-1 text-xl font-extrabold text-white">Bring Your Friends In</h3>
                <p className="mt-1 text-xs text-neutral-400">
                  Anyone with this link or code can join the synchronized room.
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-2 pl-3">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-neutral-300">
                {window.location.origin}/party/{cleanCode}
              </span>
              <Button
                onClick={handleCopyLink}
                className="h-8 rounded-lg bg-[#d6ff3f] px-3 text-xs font-bold text-black hover:bg-[#e1ff70]"
              >
                <Copy size={13} className="mr-1.5" /> Copy
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-white/[.02] p-3 text-xs text-neutral-400">
              <span>Room Code:</span>
              <span className="font-mono text-sm font-extrabold tracking-widest text-white">
                {cleanCode}
              </span>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                onClick={() => setShowInviteModal(false)}
                className="h-9 rounded-xl border-white/10 bg-white/5 px-4 text-xs font-semibold text-white hover:bg-white/10"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
