import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  User as UserIcon,
  Radio,
  History,
  ShieldCheck,
  Calendar,
  Sparkles,
  Edit2,
  Check,
  LogOut,
  ExternalLink,
  Tv,
  Film,
  Users,
} from "lucide-react";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, refresh, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || "#D6FF3F");

  // Fetch account stats & history from backend
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } =
    trpc.auth.getStats.useQuery(undefined, {
      enabled: Boolean(user?.id),
    });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      await refresh();
      refetchStats();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile.");
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty.");
      return;
    }
    updateProfileMutation.mutate({
      name: displayName.trim(),
      avatarColor,
    });
  };

  const isGoogle = user?.loginMethod === "google" || Boolean(user?.googleId);
  const avatarColors = ["#D6FF3F", "#4285F4", "#F43F5E", "#10B981", "#8B5CF6", "#F59E0B"];

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col pb-20 md:pb-10">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Card Header */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d111b]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#d6ff3f]/10 rounded-full blur-[90px] pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || "User"}
                  className="h-20 w-20 rounded-2xl object-cover ring-2 ring-[#d6ff3f]/60 shadow-lg"
                />
              ) : (
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-black text-[#0a0d14] shadow-lg"
                  style={{ backgroundColor: user?.avatarColor || avatarColor }}
                >
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {user?.name || "Anonymous Explorer"}
                  </h1>
                  {isGoogle ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4285F4]/20 border border-[#4285F4]/30 text-[#8ab4f8] text-xs font-semibold">
                      <ShieldCheck size={13} />
                      Google Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-zinc-400 text-xs font-medium">
                      Guest Session
                    </span>
                  )}
                </div>

                <p className="text-sm text-zinc-400">
                  {user?.email || "No email linked (guest account)"}
                </p>

                <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
                  <Calendar size={13} />
                  <span>
                    Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Today"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDisplayName(user?.name || "");
                  setAvatarColor(user?.avatarColor || "#D6FF3F");
                  setIsEditing(!isEditing);
                }}
                className="flex-1 sm:flex-initial border-white/15 bg-white/5 hover:bg-white/10 text-white"
              >
                <Edit2 size={15} className="mr-1.5" />
                <span>{isEditing ? "Cancel" : "Edit Profile"}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logout();
                  setLocation("/login");
                }}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <LogOut size={16} className="mr-1.5" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>

          {/* Edit Profile Form Accordion */}
          {isEditing && (
            <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-white/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Display Name</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-white/5 border-white/15 text-white focus:border-[#d6ff3f]"
                    maxLength={32}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Avatar Tone</label>
                  <div className="flex items-center gap-2 pt-1.5">
                    {avatarColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setAvatarColor(color)}
                        style={{ backgroundColor: color }}
                        className={`h-8 w-8 rounded-full transition ${
                          avatarColor === color ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0d111b]" : "opacity-70 hover:opacity-100"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-[#d6ff3f] hover:bg-[#c2ea32] text-[#0a0d14] font-semibold"
                >
                  <Check size={16} className="mr-1.5" />
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Account Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d111b]/80 p-5 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium uppercase tracking-wider">Parties Hosted</span>
              <Tv size={18} className="text-[#d6ff3f]" />
            </div>
            <div className="text-3xl font-extrabold text-white">
              {stats?.hostedCount ?? (loadingStats ? "..." : 0)}
            </div>
            <p className="text-xs text-zinc-400">Total watch party rooms created</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d111b]/80 p-5 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium uppercase tracking-wider">Parties Joined</span>
              <Users size={18} className="text-blue-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">
              {stats?.joinedCount ?? (loadingStats ? "..." : 0)}
            </div>
            <p className="text-xs text-zinc-400">Sessions watched with friends</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d111b]/80 p-5 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium uppercase tracking-wider">Live Right Now</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white">
              {stats?.activeRooms?.length ?? 0}
            </div>
            <p className="text-xs text-zinc-400">Your currently active rooms</p>
          </div>
        </div>

        {/* Quick Links & History Teaser */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={18} className="text-[#d6ff3f]" />
              <h2 className="text-lg font-bold text-white">Recent Watch Parties</h2>
            </div>
            <Link
              href="/history"
              className="text-xs font-medium text-[#d6ff3f] hover:underline flex items-center gap-1"
            >
              <span>View Full History</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          {stats?.historyRooms && stats.historyRooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.historyRooms.slice(0, 4).map((room: any) => (
                <div
                  key={room.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between hover:border-white/20 transition"
                >
                  <div className="space-y-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-400">
                        ENDED
                      </span>
                      <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                        {room.platform}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm text-white truncate">{room.title}</h3>
                    <p className="text-xs text-zinc-400">
                      Code: <span className="font-mono text-zinc-300 font-semibold">{room.code}</span>
                      {room.endedAt && (
                        <span> • {new Date(room.endedAt).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>

                  <Link href={`/party/${room.code}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/15 text-xs text-zinc-300 hover:text-white"
                    >
                      Recap
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center space-y-3">
              <Film size={32} className="mx-auto text-zinc-600" />
              <p className="text-sm text-zinc-400">You haven't participated in any watch parties yet.</p>
              <Link href="/dashboard">
                <Button size="sm" className="bg-[#d6ff3f] text-[#0a0d14] font-semibold">
                  Start Your First Party
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
