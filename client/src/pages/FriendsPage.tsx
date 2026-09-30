import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Tv,
  Radio,
  Sparkles,
  Search,
  Check,
  X,
  Copy,
  ChevronRight,
  Flame,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Clock,
  Send,
  UserX,
  Eye,
  EyeOff,
} from "lucide-react";

export default function FriendsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [addFriendInput, setAddFriendInput] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "find">("friends");

  // Real backend queries
  const { data: friendsList, isLoading: loadingFriends, refetch: refetchFriends } =
    trpc.friend.listFriends.useQuery(undefined, {
      enabled: Boolean(user?.id),
      refetchInterval: 10000,
    });

  const { data: pendingRequests, isLoading: loadingRequests, refetch: refetchRequests } =
    trpc.friend.listPendingRequests.useQuery(undefined, {
      enabled: Boolean(user?.id),
      refetchInterval: 10000,
    });

  const { data: searchResults, isFetching: searchingUsers } =
    trpc.auth.searchUsers.useQuery(
      { query: userSearchQuery.trim() },
      {
        enabled: userSearchQuery.trim().length >= 2,
      }
    );

  // Mutations
  const sendRequestMutation = trpc.friend.sendRequest.useMutation({
    onSuccess: () => {
      toast.success("Friend request sent!");
      setAddFriendInput("");
      refetchRequests();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send friend request");
    },
  });

  const respondRequestMutation = trpc.friend.respondRequest.useMutation({
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === "accept"
          ? "Friend request accepted!"
          : "Friend request declined."
      );
      refetchRequests();
      refetchFriends();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to process request");
    },
  });

  const cancelRequestMutation = trpc.friend.cancelRequest.useMutation({
    onSuccess: () => {
      toast.success("Friend request canceled");
      refetchRequests();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to cancel request");
    },
  });

  const removeFriendMutation = trpc.friend.removeFriend.useMutation({
    onSuccess: () => {
      toast.success("Friend removed");
      refetchFriends();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove friend");
    },
  });

  const handleSendFriendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const target = addFriendInput.trim().replace(/^@/, "");
    if (!target) {
      toast.error("Please enter a username or PlayOra ID");
      return;
    }
    sendRequestMutation.mutate({ playoraId: target });
  };

  const handleSendRequestToUser = (targetPlayoraId: string) => {
    sendRequestMutation.mutate({ playoraId: targetPlayoraId });
  };

  const friends = friendsList || [];
  const incoming = pendingRequests?.incoming || [];
  const outgoing = pendingRequests?.outgoing || [];

  const filteredFriends = friends.filter(
    (f) =>
      (f.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.playoraId && f.playoraId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#050505] text-[#f3f5fa] flex flex-col pb-24 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header & Add Friend Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">Friends & Companions</h1>
              <span className="px-2 py-0.5 rounded-full bg-[#d6ff3f]/15 border border-[#d6ff3f]/30 text-[#d6ff3f] text-xs font-bold font-mono">
                {friends.length} Friends
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Connect with friends, see what parties they're watching in real time, and invite them directly.
            </p>
          </div>

          {/* Quick Add By ID / Username */}
          <form
            onSubmit={handleSendFriendRequest}
            className="flex items-center gap-2 max-w-sm w-full"
          >
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Enter @username or PlayOra ID"
                value={addFriendInput}
                onChange={(e) => setAddFriendInput(e.target.value)}
                className="h-10 text-xs bg-[#0d0e12] border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:border-[#d6ff3f]"
              />
            </div>
            <Button
              type="submit"
              disabled={sendRequestMutation.isPending || !addFriendInput.trim()}
              className="h-10 px-4 text-xs font-bold bg-[#d6ff3f] text-[#050505] hover:bg-[#c2eb30] rounded-xl shrink-0"
            >
              <UserPlus size={14} className="mr-1.5" />
              Add
            </Button>
          </form>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("friends")}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === "friends"
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            All Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 rounded-xl transition relative ${
              activeTab === "requests"
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Pending Requests ({incoming.length + outgoing.length})
            {incoming.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-[#d6ff3f] text-[#050505] text-[10px] font-black">
                {incoming.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("find")}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === "find"
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Find Users
          </button>
        </div>

        {/* TAB 1: ALL FRIENDS */}
        {activeTab === "friends" && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <Input
                type="text"
                placeholder="Search friends by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-xs bg-[#0d0e12] border-white/10 text-white placeholder:text-zinc-500 rounded-xl"
              />
            </div>

            {loadingFriends ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-2xl bg-[#0d0e12] border border-white/5 animate-pulse" />
                ))}
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-white/10 bg-[#0d0e12] p-6 space-y-3">
                <Users size={32} className="mx-auto text-zinc-500" />
                <h3 className="text-base font-bold text-white">
                  {searchQuery ? "No matching friends found" : "No friends added yet"}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Share your PlayOra ID <strong className="text-[#d6ff3f]">@{user?.playoraId || user?.username}</strong> with friends or add them by ID above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFriends.map((f) => {
                  const isInParty = f.status === "in-party" && f.currentRoomCode;
                  const isWatching = f.status === "watching";
                  const isOnline = f.status === "online" || isInParty || isWatching;

                  return (
                    <div
                      key={f.id}
                      className="rounded-2xl border border-white/10 bg-[#0d0e12] p-4 flex flex-col justify-between hover:border-white/20 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {f.avatarUrl ? (
                              <img
                                src={f.avatarUrl}
                                alt={f.name || "Friend"}
                                className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10"
                              />
                            ) : (
                              <div
                                className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-black text-sm"
                                style={{ backgroundColor: f.avatarColor || "#D6FF3F" }}
                              >
                                {(f.name || "F").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span
                              className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0d0e12] ${
                                isOnline ? "bg-emerald-400" : "bg-zinc-600"
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-white truncate">{f.name}</h4>
                            <p className="text-[11px] text-zinc-400 font-mono">@{f.playoraId || `u${f.id}`}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (confirm(`Remove ${f.name} from your friends list?`)) {
                              removeFriendMutation.mutate({ friendId: f.id });
                            }
                          }}
                          title="Remove Friend"
                          className="text-zinc-500 hover:text-red-400 p-1 transition"
                        >
                          <UserX size={14} />
                        </button>
                      </div>

                      {/* Live Activity Status */}
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          {isInParty ? (
                            <>
                              <Radio size={12} className="text-[#d6ff3f] animate-pulse" />
                              <span className="font-semibold text-[#d6ff3f]">In Watch Party</span>
                            </>
                          ) : isWatching ? (
                            <>
                              <Tv size={12} className="text-emerald-400" />
                              <span className="font-semibold text-emerald-400">Watching Media</span>
                            </>
                          ) : isOnline ? (
                            <>
                              <span className="h-2 w-2 rounded-full bg-emerald-400" />
                              <span className="text-zinc-400">Online & Ready</span>
                            </>
                          ) : (
                            <>
                              <Clock size={12} className="text-zinc-600" />
                              <span className="text-zinc-500">Offline</span>
                            </>
                          )}
                        </div>

                        {f.currentActivityTitle && (
                          <p className="text-[11px] text-zinc-300 truncate">
                            {f.currentActivityTitle}
                          </p>
                        )}
                      </div>

                      {/* Action */}
                      {isInParty && (
                        <Link href={`/party/${f.currentRoomCode}`}>
                          <Button className="w-full h-8 text-xs font-bold bg-[#d6ff3f] text-[#050505] hover:bg-[#c2eb30] rounded-xl">
                            Join Party ({f.currentRoomCode})
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PENDING REQUESTS */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            {/* Incoming Requests */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Incoming Requests ({incoming.length})
              </h3>

              {incoming.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#0d0e12] border border-white/5 text-xs text-zinc-500">
                  No incoming friend requests at the moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {incoming.map((req: any) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-[#0d0e12] border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-black"
                          style={{ backgroundColor: req.senderAvatarColor || "#D6FF3F" }}
                        >
                          {req.senderName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{req.senderName}</h4>
                          <p className="text-[11px] text-zinc-400 font-mono">@{req.senderPlayoraId}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            respondRequestMutation.mutate({
                              friendshipId: req.id,
                              action: "accept",
                            })
                          }
                          className="h-8 bg-[#d6ff3f] text-[#050505] font-bold text-xs rounded-lg hover:bg-[#c2eb30]"
                        >
                          <Check size={14} className="mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            respondRequestMutation.mutate({
                              friendshipId: req.id,
                              action: "decline",
                            })
                          }
                          className="h-8 text-zinc-400 hover:text-white"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Sent Requests ({outgoing.length})
              </h3>

              {outgoing.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#0d0e12] border border-white/5 text-xs text-zinc-500">
                  No pending sent requests.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {outgoing.map((req: any) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-[#0d0e12] border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-black"
                          style={{ backgroundColor: req.receiverAvatarColor || "#D6FF3F" }}
                        >
                          {req.receiverName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{req.receiverName}</h4>
                          <p className="text-[11px] text-zinc-400 font-mono">@{req.receiverPlayoraId}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelRequestMutation.mutate({ friendshipId: req.id })}
                        className="h-8 border-white/10 text-xs text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FIND USERS */}
        {activeTab === "find" && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <Input
                type="text"
                placeholder="Search by name, username, or @PlayOraID..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-10 h-10 text-xs bg-[#0d0e12] border-white/10 text-white placeholder:text-zinc-500 rounded-xl"
              />
            </div>

            {searchingUsers ? (
              <p className="text-xs text-zinc-400">Searching PlayOra community...</p>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((u) => {
                  const isSelf = u.id === user?.id;
                  const alreadyFriend = friends.some((f) => f.id === u.id);

                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-2xl bg-[#0d0e12] border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-black"
                          style={{ backgroundColor: u.avatarColor || "#D6FF3F" }}
                        >
                          {(u.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{u.name || "User"}</h4>
                          <p className="text-[11px] text-zinc-400 font-mono">@{u.playoraId || u.username}</p>
                        </div>
                      </div>

                      {isSelf ? (
                        <span className="text-[10px] text-zinc-500 font-semibold">You</span>
                      ) : alreadyFriend ? (
                        <span className="text-[10px] text-[#d6ff3f] font-semibold flex items-center gap-1">
                          <Check size={12} /> Friends
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleSendRequestToUser(u.playoraId || u.username || "")}
                          disabled={sendRequestMutation.isPending}
                          className="h-8 bg-white/10 text-white font-semibold text-xs rounded-lg hover:bg-[#d6ff3f] hover:text-[#050505] transition"
                        >
                          <UserPlus size={14} className="mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : userSearchQuery.trim().length >= 2 ? (
              <div className="p-8 text-center rounded-2xl border border-white/5 bg-[#0d0e12] text-xs text-zinc-500">
                No users found matching "{userSearchQuery}".
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-white/5 bg-[#0d0e12] text-xs text-zinc-500">
                Type at least 2 characters to search across the PlayOra network.
              </div>
            )}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
