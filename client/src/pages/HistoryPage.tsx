import React, { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  History,
  Search,
  Calendar,
  Clock,
  ExternalLink,
  Film,
  RotateCcw,
  Sparkles,
  Tv,
} from "lucide-react";

function formatDuration(startedAt?: Date | string | null, endedAt?: Date | string | null) {
  if (!startedAt || !endedAt) return "Concluded";
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));
  const mins = Math.floor(diffSec / 60);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMins}m`;
  }
  return `${mins}m`;
}

export default function HistoryPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "mine">("all");

  const { data: historyRooms, isLoading } = trpc.party.listHistory.useQuery(
    filterMode === "mine" && user?.id ? { userId: user.id } : undefined
  );

  const filteredHistory = useMemo(() => {
    if (!historyRooms) return [];
    return historyRooms.filter((room) => {
      const matchesSearch =
        room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.platform.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [historyRooms, searchQuery]);

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col pb-20 md:pb-10">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
              <span>Archived Room History</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Watch Party History
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Browse previously concluded watch parties, review session metrics, and re-launch favorites.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                filterMode === "all"
                  ? "bg-[#d6ff3f] text-[#0a0d14]"
                  : "bg-white/5 border border-white/10 text-zinc-300 hover:text-white"
              }`}
            >
              All Recent
            </button>
            {user?.id && (
              <button
                onClick={() => setFilterMode("mine")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterMode === "mine"
                    ? "bg-[#d6ff3f] text-[#0a0d14]"
                    : "bg-white/5 border border-white/10 text-zinc-300 hover:text-white"
                }`}
              >
                My Hosted Parties
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history by title, platform or code..."
            className="pl-10 h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-[#d6ff3f]"
          />
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-24 rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse"
              />
            ))}
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="space-y-3">
            {filteredHistory.map((room) => {
              const duration = formatDuration(room.startedAt, room.endedAt);
              return (
                <div
                  key={room.id}
                  className="rounded-2xl border border-white/10 bg-[#0d111b]/80 p-4 sm:p-5 backdrop-blur-md hover:border-white/20 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-500/15 border border-red-500/20 text-red-400">
                        ENDED
                      </span>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                        {room.platform}
                      </span>
                      <span className="text-xs text-zinc-500">•</span>
                      <span className="font-mono text-xs text-zinc-300 font-semibold">
                        {room.code}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-white truncate">{room.title}</h3>

                    <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} />
                        <span>
                          {room.endedAt
                            ? new Date(room.endedAt).toLocaleDateString()
                            : new Date(room.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} />
                        <span>Duration: {duration}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link href={`/party/${room.code}`} className="flex-1 sm:flex-initial">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto border-white/15 text-xs text-zinc-300 hover:text-white"
                      >
                        <span>View Recap</span>
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      onClick={() => {
                        // Navigate to dashboard and prefill
                        setLocation(`/dashboard?url=${encodeURIComponent(room.contentUrl)}&title=${encodeURIComponent(room.title)}`);
                      }}
                      className="flex-1 sm:flex-initial bg-[#d6ff3f] hover:bg-[#c2ea32] text-[#0a0d14] font-semibold text-xs h-8"
                    >
                      <RotateCcw size={13} className="mr-1" />
                      <span>Re-launch</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-[#0d111b]/60 p-12 text-center space-y-4 max-w-lg mx-auto mt-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-zinc-400 mx-auto">
              <History size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No history records found</h3>
              <p className="text-sm text-zinc-400">
                {searchQuery
                  ? "No watch party records match your search."
                  : "Watch party sessions will appear here once they conclude."}
              </p>
            </div>
            <Link href="/dashboard">
              <Button className="bg-[#d6ff3f] hover:bg-[#c2ea32] text-[#0a0d14] font-bold">
                Host a Watch Party
              </Button>
            </Link>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
