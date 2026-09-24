import React, { useState, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  resolveStreamingContent,
  formatTimecode,
  ResolvedContent,
  DriftStatus,
} from "@shared/universal-streaming-engine";
import { useRoomSocket, QueueItem } from "@/hooks/useRoomSocket";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { YouTubeAdapter } from "@/components/adapters/YouTubeAdapter";
import { TwitchAdapter } from "@/components/adapters/TwitchAdapter";
import { VimeoAdapter } from "@/components/adapters/VimeoAdapter";
import { GenericHTML5Adapter } from "@/components/adapters/GenericHTML5Adapter";
import { KickAdapter } from "@/components/adapters/KickAdapter";
import { AssistedSyncAdapter } from "@/components/adapters/AssistedSyncAdapter";
import { AdapterDiagnostics } from "@/components/adapters/types";
import { ChatPanel } from "@/components/ChatPanel";
import { ParticipantsPanel } from "@/components/ParticipantsPanel";
import { ReactionsOverlay } from "@/components/ReactionsOverlay";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { CountdownModal } from "@/components/CountdownModal";
import { DiagnosticsModal } from "@/components/DiagnosticsModal";
import { HostControlCenter } from "@/components/HostControlCenter";
import { PartyQueueModal } from "@/components/PartyQueueModal";
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
  AlertCircle,
  Activity,
  ListVideo,
  Crown,
  Sparkles,
  PhoneOff,
  LogOut,
  Radio,
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

  // Modals & Panels state
  const [activeTab, setActiveTab] = useState<"chat" | "people">("chat");
  const [mobilePanel, setMobilePanel] = useState<"none" | "chat" | "people">("none");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showHostControls, setShowHostControls] = useState(false);

  const [countdownState, setCountdownState] = useState<{ count: number; message: string }>({
    count: 0,
    message: "",
  });

  // Local player state & diagnostics
  const [localPlayerPos, setLocalPlayerPos] = useState(0);
  const [targetSeekPos, setTargetSeekPos] = useState(0);
  const [diagnostics, setDiagnostics] = useState<AdapterDiagnostics | null>(null);

  const handleDiagnosticsUpdate = useCallback((partial: Partial<AdapterDiagnostics>) => {
    setDiagnostics((prev) => (prev ? { ...prev, ...partial } : (partial as AdapterDiagnostics)));
  }, []);

  // Current user info for socket
  const socketUser = useMemo(
    () => ({
      id: user?.id || 9999,
      name: user?.name || "Guest " + cleanCode.slice(0, 4),
      avatarColor: user?.avatarColor || "#D6FF3F",
    }),
    [user, cleanCode]
  );

  const voiceChatRef = useRef<any>(null);

  // WebSocket real-time connection
  const {
    connected,
    connectionStatus,
    peerId,
    role,
    members,
    messages,
    activeReaction,
    roomPlayback,
    clockOffset,
    latencyMs,
    localDrift,
    driftStatus,
    queue,
    roomContent,
    roomSettings,
    calculateDrift,
    broadcastPlayback,
    sendChatMessage,
    deleteChatMessage,
    sendReaction,
    triggerCountdown,
    joinVoiceChannel,
    leaveVoiceChannel,
    updateVoiceState,
    sendVoiceSignal,
    changeContent,
    updateQueue,
    transferHost,
    kickPeer,
    updateSettings,
    leaveRoom,
  } = useRoomSocket({
    roomCode: cleanCode,
    user: socketUser,
    platform: room?.platform,
    contentUrl: room?.contentUrl,
    onPlaybackSync: useCallback((state: any) => {
      setTargetSeekPos(state.position);
    }, []),
    onVoiceSignal: useCallback((senderPeerId: string, senderName: string, signal: any) => {
      voiceChatRef.current?.handleVoiceSignal(senderPeerId, senderName, signal);
    }, []),
    onCountdownTick: useCallback((count: number, message: string) => {
      setCountdownState({ count, message });
    }, []),
    onContentChanged: useCallback((newContent: any) => {
      setTargetSeekPos(0);
      setLocalPlayerPos(0);
      toast.info(`Stream switched to ${newContent.title}`);
    }, []),
    onKicked: useCallback((msg: string) => {
      toast.error(msg);
      setLocation("/dashboard");
    }, [setLocation]),
  });

  // Voice Chat Hook
  const voiceChat = useVoiceChat({
    myPeerId: peerId,
    activeMembers: members,
    sendSignal: sendVoiceSignal,
    joinVoiceChannel,
    leaveVoiceChannel,
    onSpeakingChange: useCallback((isSpeaking: boolean) => {
      updateVoiceState(voiceChatRef.current?.muted ?? false, isSpeaking);
    }, [updateVoiceState]),
  });
  voiceChatRef.current = voiceChat;

  // Authoritative Leave Room (Requirement 21)
  const handleLeaveRoom = useCallback(() => {
    voiceChat.leaveVoice();
    leaveRoom();
    setLocation("/dashboard");
  }, [voiceChat, leaveRoom, setLocation]);

  const isHost = role === "host" || room?.hostId === socketUser.id;
  const canControl = isHost || !roomSettings?.hostOnlyControls;

  // Active content: prioritize real-time broadcasted roomContent over initial DB fetch
  const activeUrl = roomContent?.contentUrl || room?.contentUrl || "https://www.youtube.com/watch?v=M7lc1UVf-VE";
  const activeTitle = roomContent?.title || room?.title || `Watch Party ${cleanCode}`;

  // Resolve content dynamically via universal engine
  const resolvedContent: ResolvedContent = useMemo(() => {
    return resolveStreamingContent(activeUrl);
  }, [activeUrl]);

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

  // Auto-advance playlist queue when a video finishes
  const handleVideoEnded = useCallback(() => {
    if (isHost && queue.length > 0) {
      const nextItem = queue[0];
      const remainingQueue = queue.slice(1);
      updateQueue(remainingQueue);
      changeContent(nextItem.url, nextItem.platform, nextItem.title);
      toast.success(`Playing next in queue: ${nextItem.title}`);
    }
  }, [isHost, queue, updateQueue, changeContent]);

  // Queue actions
  const handleAddToQueue = (item: Omit<QueueItem, "id">) => {
    const newItem: QueueItem = {
      ...item,
      id: "q_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      addedBy: socketUser.name,
    };
    updateQueue([...queue, newItem]);
  };

  const handlePlayQueueItem = (item: QueueItem) => {
    if (!isHost) return;
    const remainingQueue = queue.filter((q) => q.id !== item.id);
    updateQueue(remainingQueue);
    changeContent(item.url, item.platform, item.title);
  };

  const handleRemoveQueueItem = (id: string) => {
    updateQueue(queue.filter((q) => q.id !== id));
  };

  const handleClearQueue = () => {
    updateQueue([]);
  };

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

  // Render the appropriate player adapter
  const renderAdapter = () => {
    switch (resolvedContent.platform) {
      case "youtube":
        return (
          <YouTubeAdapter
            content={resolvedContent}
            isHost={isHost}
            canControl={canControl}
            isPlaying={roomPlayback.isPlaying}
            targetPosition={targetSeekPos || roomPlayback.currentPosition}
            onPositionUpdate={handlePositionUpdate}
            onLocalPlaybackChange={handleLocalPlaybackChange}
            onDiagnosticsUpdate={handleDiagnosticsUpdate}
            onEnded={handleVideoEnded}
          />
        );

      case "twitch":
        return (
          <TwitchAdapter
            content={resolvedContent}
            isHost={isHost}
            canControl={canControl}
            isPlaying={roomPlayback.isPlaying}
            targetPosition={targetSeekPos || roomPlayback.currentPosition}
            onPositionUpdate={handlePositionUpdate}
            onLocalPlaybackChange={handleLocalPlaybackChange}
            onDiagnosticsUpdate={handleDiagnosticsUpdate}
            onEnded={handleVideoEnded}
          />
        );

      case "vimeo":
        return (
          <VimeoAdapter
            content={resolvedContent}
            isHost={isHost}
            canControl={canControl}
            isPlaying={roomPlayback.isPlaying}
            targetPosition={targetSeekPos || roomPlayback.currentPosition}
            onPositionUpdate={handlePositionUpdate}
            onLocalPlaybackChange={handleLocalPlaybackChange}
            onDiagnosticsUpdate={handleDiagnosticsUpdate}
            onEnded={handleVideoEnded}
          />
        );

      case "html5":
        return (
          <GenericHTML5Adapter
            content={resolvedContent}
            isHost={isHost}
            canControl={canControl}
            isPlaying={roomPlayback.isPlaying}
            targetPosition={targetSeekPos || roomPlayback.currentPosition}
            onPositionUpdate={handlePositionUpdate}
            onLocalPlaybackChange={handleLocalPlaybackChange}
            onDiagnosticsUpdate={handleDiagnosticsUpdate}
            onEnded={handleVideoEnded}
          />
        );

      case "kick":
        return (
          <KickAdapter
            content={resolvedContent}
            isHost={isHost}
            isPlaying={roomPlayback.isPlaying}
            onTriggerCountdown={() => triggerCountdown(3)}
            onDiagnosticsUpdate={handleDiagnosticsUpdate}
          />
        );

      default:
        // OTT Platforms (Netflix, Prime, Disney+, Hotstar, Crunchyroll, etc.) or unknown
        return (
          <AssistedSyncAdapter
            content={resolvedContent}
            roomTitle={activeTitle}
            isHost={isHost}
            isPlaying={roomPlayback.isPlaying}
            currentPosition={localPlayerPos || roomPlayback.currentPosition}
            onTogglePlayback={() =>
              handleLocalPlaybackChange(!roomPlayback.isPlaying, localPlayerPos)
            }
            onTriggerCountdown={() => triggerCountdown(3)}
            onDiagnosticsUpdate={handleDiagnosticsUpdate}
          />
        );
    }
  };

  return (
    <div className="playora-shell flex min-h-screen flex-col overflow-hidden">
      <div className="noise-overlay" />

      {/* Synchronized 3-2-1 Countdown Overlay */}
      <CountdownModal count={countdownState.count} message={countdownState.message} />

      {/* Floating Reactions Canvas/Particle Overlay */}
      <ReactionsOverlay activeReaction={activeReaction} />

      {/* Telemetry Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
        diagnostics={diagnostics}
        content={resolvedContent}
        latencyMs={latencyMs}
        clockOffset={clockOffset}
        localDrift={localDrift}
        driftStatus={driftStatus}
        connected={connected}
        voiceConnected={!voiceChat.muted}
        voicePeerCount={voiceChat.connectedPeersCount}
        onForceResync={handleSyncNow}
      />

      {/* Playlist Queue Modal */}
      <PartyQueueModal
        isOpen={showQueueModal}
        onClose={() => setShowQueueModal(false)}
        queue={queue}
        currentUrl={activeUrl}
        isHost={isHost}
        onAddToQueue={handleAddToQueue}
        onPlayItem={handlePlayQueueItem}
        onRemoveItem={handleRemoveQueueItem}
        onClearQueue={handleClearQueue}
      />

      {/* Host Control Center Drawer/Modal */}
      {isHost && (
        <HostControlCenter
          isOpen={showHostControls}
          onClose={() => setShowHostControls(false)}
          isPlaying={roomPlayback.isPlaying}
          currentPosition={localPlayerPos || roomPlayback.currentPosition}
          members={members}
          currentPeerId={peerId}
          settings={roomSettings}
          onTogglePlay={(playState) =>
            handleLocalPlaybackChange(playState, localPlayerPos || roomPlayback.currentPosition)
          }
          onSeek={(newPos) => {
            setTargetSeekPos(newPos);
            broadcastPlayback("seek", newPos);
          }}
          onForceSyncEveryone={() =>
            broadcastPlayback(
              roomPlayback.isPlaying ? "play" : "pause",
              localPlayerPos || roomPlayback.currentPosition
            )
          }
          onTriggerCountdown={(sec) => triggerCountdown(sec || 3)}
          onChangeContent={(newUrl, platform, title) => changeContent(newUrl, platform, title)}
          onUpdateSettings={updateSettings}
          onTransferHost={transferHost}
          onKickMember={kickPeer}
        />
      )}

      {/* Top Navigation Bar */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/[.08] bg-[#0c0e15]/90 px-4 backdrop-blur-xl lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeaveRoom}
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
              <h1 className="max-w-[170px] truncate text-xs font-black text-white sm:max-w-xs md:max-w-md">
                {activeTitle}
              </h1>
              <div className="flex items-center gap-2 text-[9px] text-neutral-400">
                <span className="font-mono font-bold text-[#d6ff3f]">{cleanCode}</span>
                <span>•</span>
                <span>{resolvedContent.platformName}</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline capitalize">{resolvedContent.contentType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Right Status & Controls */}
        <div className="flex items-center gap-2">
          {/* Real-time Sync Status Indicator */}
          <SyncStatusIndicator
            status={driftStatus}
            driftSeconds={localDrift}
            latencyMs={latencyMs}
            onSyncNow={handleSyncNow}
            showSyncButton={resolvedContent.capabilities.syncCapability === "automatic"}
          />

          {/* Diagnostics Button */}
          <Button
            onClick={() => setShowDiagnosticsModal(true)}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10"
            title="Diagnostics & Stream Info"
          >
            <Activity size={14} />
          </Button>

          {/* Party Playlist Queue Button */}
          <Button
            onClick={() => setShowQueueModal(true)}
            variant="outline"
            size="sm"
            className="relative h-8 rounded-lg border-white/10 bg-white/5 px-2.5 text-xs font-bold text-white hover:bg-white/10"
          >
            <ListVideo size={14} className="mr-1.5" />
            <span className="hidden sm:inline">Queue</span>
            {queue.length > 0 && (
              <span className="ml-1.5 rounded-full bg-[#d6ff3f] px-1.5 py-0.2 text-[9px] font-mono font-black text-black">
                {queue.length}
              </span>
            )}
          </Button>

          {/* Host Control Center Button */}
          {isHost && (
            <Button
              onClick={() => setShowHostControls(true)}
              size="sm"
              className="h-8 rounded-lg bg-amber-400/20 border border-amber-400/40 px-2.5 text-xs font-bold text-amber-300 hover:bg-amber-400/30"
            >
              <Crown size={13} className="mr-1.5 text-amber-400" />
              <span className="hidden sm:inline">Host Controls</span>
            </Button>
          )}

          {/* Voice Chat Controls (Requirement 17) */}
          {voiceChat.voiceState === "disconnected" && (
            <Button
              onClick={voiceChat.joinVoice}
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50"
              title="Join Voice Chat"
            >
              <Mic size={13} className="mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Join Voice</span>
            </Button>
          )}

          {voiceChat.voiceState === "connecting" && (
            <Button
              disabled
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-400"
            >
              <Waves size={13} className="mr-1 sm:mr-1.5 animate-spin" />
              <span className="hidden sm:inline">Connecting...</span>
            </Button>
          )}

          {voiceChat.voiceState === "connected" && (
            <div className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 p-0.5">
              <Button
                onClick={voiceChat.toggleMute}
                size="sm"
                variant="ghost"
                className={`h-7 px-2 text-xs font-bold ${
                  voiceChat.muted ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300"
                }`}
                title={voiceChat.muted ? "Unmute microphone" : "Mute microphone"}
              >
                {voiceChat.muted ? (
                  <>
                    <MicOff size={13} className="mr-1 text-amber-400" />
                    <span className="hidden sm:inline">Muted</span>
                  </>
                ) : (
                  <>
                    <Mic size={13} className="mr-1 text-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">Voice Live</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => voiceChat.leaveVoice()}
                size="sm"
                variant="ghost"
                className="h-7 px-1.5 text-xs text-neutral-400 hover:text-red-400 hover:bg-red-500/20"
                title="Leave Voice"
              >
                <PhoneOff size={12} />
              </Button>
            </div>
          )}

          {voiceChat.voiceState === "reconnecting" && (
            <Button
              disabled
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-amber-500/40 bg-amber-500/10 px-2.5 text-xs font-bold text-amber-300 animate-pulse"
            >
              <Waves size={13} className="mr-1 sm:mr-1.5 animate-pulse" />
              <span className="hidden sm:inline">Reconnecting...</span>
            </Button>
          )}

          {/* Invite Button */}
          <Button
            onClick={() => setShowInviteModal(true)}
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-[#d6ff3f]/30 bg-[#d6ff3f]/10 px-2.5 text-xs font-bold text-[#d6ff3f] hover:bg-[#d6ff3f]/20"
          >
            <Share2 size={13} className="mr-1.5" />
            <span className="hidden sm:inline">Invite</span>
          </Button>

          {/* Leave Party Button (Requirement 21) */}
          <Button
            onClick={handleLeaveRoom}
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-red-500/20 bg-red-500/5 px-2 text-xs font-bold text-red-400 hover:bg-red-500/10 hover:border-red-500/40"
            title="Leave Watch Party"
          >
            <LogOut size={13} className="sm:mr-1.5" />
            <span className="hidden sm:inline">Leave</span>
          </Button>
        </div>
      </header>

      {/* Reconnecting Banner (Requirement 9 & 26) */}
      {connectionStatus === "reconnecting" && (
        <div className="relative z-20 flex items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 py-1.5 text-xs font-semibold text-amber-300">
          <Waves size={13} className="animate-pulse" />
          <span>Reconnecting to watch party... Your session and sync will resume automatically.</span>
        </div>
      )}

      {/* Main Room Split View: Video Surface on Left, Social Panel on Right */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-3 p-3 lg:grid lg:grid-cols-[1fr_360px] lg:p-4 min-h-0">
        {/* Left: Video Player Surface */}
        <section className="flex flex-col min-w-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
            {renderAdapter()}
          </div>

          {/* Quick Playback Bar & Floating Reactions for Mobile / Desktop */}
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
                  className="btn-press rounded-md px-2 py-1 text-sm hover:bg-white/10"
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
                isHost={isHost}
                onKickMember={isHost ? kickPeer : undefined}
                onTransferHost={isHost ? transferHost : undefined}
              />
            )}
          </div>
        </aside>
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11141c] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Invite Friends</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="mt-2 text-xs text-neutral-400">
              Anyone with this party link or code can jump straight into the room and watch with you.
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Party Code</p>
              <p className="mt-1 font-mono text-2xl font-black text-[#d6ff3f]">{cleanCode}</p>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleCopyLink}
                className="h-10 flex-1 rounded-xl bg-[#d6ff3f] text-xs font-bold text-black hover:bg-[#e1ff70]"
              >
                <Copy size={14} className="mr-1.5" />
                Copy Party Link
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Microphone Permission Modal (Requirement 16) */}
      {voiceChat.permissionError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-[#161a24] p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle size={20} />
              <h3 className="text-sm font-bold text-white">Microphone Permission Required</h3>
            </div>
            <p className="mt-2 text-xs text-neutral-300">
              Browser microphone access is required to speak in voice chat. Watch party, video synchronization, and text chat will continue normally without voice.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={voiceChat.joinVoice}
                className="h-9 flex-1 rounded-xl bg-[#d6ff3f] text-xs font-bold text-black hover:bg-[#e1ff70]"
              >
                Try Again
              </Button>
              <Button
                onClick={voiceChat.clearPermissionError}
                variant="outline"
                className="h-9 flex-1 rounded-xl border-white/10 text-xs font-bold text-neutral-300 hover:bg-white/10"
              >
                Continue Without Voice
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
