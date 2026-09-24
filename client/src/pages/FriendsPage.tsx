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
  Copy,
  ChevronRight,
  Flame,
  ArrowRight,
} from "lucide-react";

interface Companion {
  id: string;
  name: string;
  avatarColor: string;
  avatarUrl?: string;
  status: "online" | "in-party" | "offline";
  currentRoom?: string;
  lastWatched?: string;
}

export default function FriendsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [copiedRoomCode, setCopiedRoomCode] = useState<string | null>(null);

  const { data: activeRooms } = trpc.party.listActive.useQuery(undefined, {
    refetchInterval: 10000,
  });

  // Dynamic co-watchers and sample companion network
  const [companions, setCompanions] = useState<Companion[]>([
    {
      id: "u-1",
      name: "Alex Vance",
      avatarColor: "#D6FF3F",
      status: "online",
      lastWatched: "Cyberpunk: Edgerunners Ep. 4",
    },
    {
      id: "u-2",
      name: "Elena Rostova",
      avatarColor: "#9146FF",
      status: "in-party",
      currentRoom: "MOVIE99",
      lastWatched: "Twitch Rivals Grand Finals",
    },
    {
      id: "u-3",
      name: "Samir Chen",
      avatarColor: "#00E5FF",
      status: "online",
      lastWatched: "Stranger Things Season Finale",
    },
    {
      id: "u-4",
      name: "Jordan Sparks",
      avatarColor: "#FF4D4D",
      status: "offline",
      lastWatched: "Lofi Hip Hop Study Session",
    },
  ]);

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCodeInput.trim()) {
      toast.error("Enter a username or friend ID");
      return;
    }

    const newCompanion: Companion = {
      id: `u-${Date.now()}`,
      name: friendCodeInput.trim(),
      avatarColor: ["#D6FF3F", "#00E5FF", "#9146FF", "#FF7700", "#FF4D4D"][
        Math.floor(Math.random() * 5)
      ],
      status: "online",
      lastWatched: "Just added as companion",
    };

    setCompanions((prev) => [newCompanion, ...prev]);
    setFriendCodeInput("");
    toast.success(`${newCompanion.name} added to your friends list!`);
  };

  const handleCopyInvite = (code: string) => {
    const inviteUrl = `${window.location.origin}/party/${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedRoomCode(code);
    toast.success("Invite link copied to clipboard!", {
      description: inviteUrl,
    });
    setTimeout(() => setCopiedRoomCode(null), 2500);
  };

  const filteredCompanions = companions.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col pb-20 md:pb-10">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d6ff3f]/10 border border-[#d6ff3f]/20 text-[#d6ff3f] text-xs font-semibold mb-2">
              <Users size={14} />
              <span>Social & Watch Companions</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Friends & Co-Watchers
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Invite friends to your active parties or jump into their ongoing rooms.
            </p>
          </div>

          <Link href="/party/create">
            <Button className="bg-[#d6ff3f] hover:bg-[#c2ea32] text-[#0a0d14] font-bold shadow-lg shadow-[#d6ff3f]/10">
              <Tv size={16} className="mr-1.5" />
              <span>Start Watch Party</span>
            </Button>
          </Link>
        </div>

        {/* Add Friend Form & Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Add Friend Box */}
          <div className="rounded-2xl border border-white/10 bg-[#0d111b]/80 p-5 backdrop-blur-md space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserPlus size={16} className="text-[#d6ff3f]" />
              Add Watch Companion
            </h3>
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <Input
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value)}
                placeholder="Enter handle or user ID..."
                className="h-10 bg-white/5 border-white/10 text-white text-xs placeholder:text-zinc-500 focus:border-[#d6ff3f]"
              />
              <Button
                type="submit"
                size="sm"
                className="h-10 bg-white/10 hover:bg-[#d6ff3f] hover:text-[#0a0d14] text-white font-bold text-xs shrink-0"
              >
                Add Friend
              </Button>
            </form>
          </div>

          {/* Search Companions */}
          <div className="rounded-2xl border border-white/10 bg-[#0d111b]/80 p-5 backdrop-blur-md space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Search size={16} className="text-purple-400" />
              Search Friends
            </h3>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by friend name..."
                className="pl-9 h-10 bg-white/5 border-white/10 text-white text-xs placeholder:text-zinc-500 focus:border-[#d6ff3f]"
              />
            </div>
          </div>
        </div>

        {/* Companions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-[#d6ff3f]" />
              Your Companions ({filteredCompanions.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanions.map((companion) => (
              <div
                key={companion.id}
                className="rounded-2xl border border-white/10 bg-[#0d111b]/80 p-5 backdrop-blur-md hover:border-white/20 transition flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-11 w-11 rounded-2xl flex items-center justify-center font-extrabold text-black text-sm relative shadow-md"
                      style={{ backgroundColor: companion.avatarColor }}
                    >
                      {companion.name.slice(0, 2).toUpperCase()}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0d111b] ${
                          companion.status === "online"
                            ? "bg-emerald-400"
                            : companion.status === "in-party"
                            ? "bg-purple-400 animate-pulse"
                            : "bg-zinc-500"
                        }`}
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{companion.name}</h4>
                      <p className="text-[11px] text-zinc-400 capitalize">
                        {companion.status === "in-party"
                          ? "Watching in room"
                          : companion.status}
                      </p>
                    </div>
                  </div>

                  {companion.status === "in-party" && companion.currentRoom && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      LIVE
                    </span>
                  )}
                </div>

                <div className="text-xs text-zinc-400 border-t border-white/5 pt-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
                    Recent Activity
                  </span>
                  <span className="text-zinc-300 truncate block mt-0.5">
                    {companion.lastWatched}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {companion.status === "in-party" && companion.currentRoom ? (
                    <Link href={`/party/${companion.currentRoom}`} className="w-full">
                      <Button
                        size="sm"
                        className="w-full bg-[#d6ff3f] hover:bg-[#c2ea32] text-black font-extrabold text-xs h-8"
                      >
                        <span>Join Party</span>
                        <ArrowRight size={14} className="ml-1" />
                      </Button>
                    </Link>
                  ) : activeRooms && activeRooms.length > 0 ? (
                    <Button
                      size="sm"
                      onClick={() => handleCopyInvite(activeRooms[0].code)}
                      variant="outline"
                      className="w-full border-white/10 hover:border-[#d6ff3f]/50 text-zinc-200 text-xs h-8"
                    >
                      <Copy size={13} className="mr-1.5" />
                      <span>Invite to Room {activeRooms[0].code}</span>
                    </Button>
                  ) : (
                    <Link href="/party/create" className="w-full">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-white/10 hover:border-[#d6ff3f]/50 text-zinc-200 text-xs h-8"
                      >
                        <Tv size={13} className="mr-1.5" />
                        <span>Invite to New Room</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
