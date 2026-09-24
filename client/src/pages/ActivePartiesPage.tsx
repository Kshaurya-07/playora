import React, { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Radio,
  Search,
  Sparkles,
  Users,
  Plus,
  ArrowRight,
  Tv,
  Film,
  Flame,
  ExternalLink,
} from "lucide-react";

export default function ActivePartiesPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  const { data: activeRooms, isLoading, refetch } = trpc.party.listActive.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const platforms = [
    { id: "all", label: "All Platforms" },
    { id: "youtube", label: "YouTube" },
    { id: "twitch", label: "Twitch" },
    { id: "kick", label: "Kick" },
    { id: "vimeo", label: "Vimeo" },
  ];

  const filteredRooms = useMemo(() => {
    if (!activeRooms) return [];
    return activeRooms.filter((room) => {
      const matchesSearch =
        room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlatform =
        selectedPlatform === "all" || room.platform.toLowerCase() === selectedPlatform.toLowerCase();
      return matchesSearch && matchesPlatform;
    });
  }, [activeRooms, searchQuery, selectedPlatform]);

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col pb-20 md:pb-10">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Synchronized Rooms</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Active Watch Parties
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Join ongoing watch parties or start your own universal room with instant sync.
            </p>
          </div>

          <Link href="/dashboard">
            <Button className="bg-[#d6ff3f] hover:bg-[#c2ea32] text-[#0a0d14] font-bold shadow-lg shadow-[#d6ff3f]/10">
              <Plus size={18} className="mr-1.5" />
              <span>Create New Party</span>
            </Button>
          </Link>
        </div>

        {/* Search & Platform Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by party title or room code..."
              className="pl-10 h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-[#d6ff3f]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedPlatform === p.id
                    ? "bg-[#d6ff3f] text-[#0a0d14] shadow-sm"
                    : "bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rooms Listing */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-44 rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse"
              />
            ))}
          </div>
        ) : filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="group rounded-2xl border border-white/10 bg-[#0d111b]/80 p-5 backdrop-blur-md hover:border-[#d6ff3f]/50 transition-all shadow-lg flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold tracking-wide uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ACTIVE
                    </span>
                    <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded bg-white/10 text-zinc-300 tracking-wider">
                      {room.platform}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-[#d6ff3f] transition line-clamp-2">
                      {room.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Room Code: <span className="font-mono text-[#d6ff3f] font-bold">{room.code}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="text-[11px] text-zinc-400">
                    <span>Started {new Date(room.startedAt || room.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  <Link href={`/party/${room.code}`}>
                    <Button
                      size="sm"
                      className="bg-white/10 hover:bg-[#d6ff3f] hover:text-[#0a0d14] text-white font-semibold transition text-xs h-8"
                    >
                      <span>Join Party</span>
                      <ArrowRight size={14} className="ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-[#0d111b]/60 p-12 text-center space-y-4 max-w-lg mx-auto mt-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d6ff3f]/10 text-[#d6ff3f] mx-auto">
              <Tv size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No active parties found</h3>
              <p className="text-sm text-zinc-400">
                {searchQuery
                  ? "No active parties match your search filters."
                  : "Be the first to launch a watch party right now!"}
              </p>
            </div>
            <Link href="/dashboard">
              <Button className="bg-[#d6ff3f] hover:bg-[#c2ea32] text-[#0a0d14] font-bold">
                <Plus size={16} className="mr-1.5" />
                Launch Watch Party
              </Button>
            </Link>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
