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
  Copy,
  Ghost,
  Eye,
  EyeOff,
  Lock,
  Globe,
  Settings,
} from "lucide-react";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, refresh, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [username, setUsername] = useState((user as any)?.username || "");
  const [bio, setBio] = useState((user as any)?.bio || "");
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || "#D6FF3F");
  const [ghostMode, setGhostMode] = useState<boolean>(Boolean((user as any)?.ghostMode));
  const [activityVisibility, setActivityVisibility] = useState<"public" | "friends" | "none">(
    ((user as any)?.activityVisibility as "public" | "friends" | "none") || "friends"
  );
  const [allowFriendRequests, setAllowFriendRequests] = useState<boolean>(
    (user as any)?.allowFriendRequests ?? true
  );

  // Fetch account stats & history from backend
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } =
    trpc.auth.getStats.useQuery(undefined, {
      enabled: Boolean(user?.id),
    });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Profile & privacy settings updated!");
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
      username: username.trim() || undefined,
      bio: bio.trim() || undefined,
      avatarColor,
      ghostMode,
      activityVisibility,
      allowFriendRequests,
    });
  };

  const handleToggleGhostMode = () => {
    const nextVal = !ghostMode;
    setGhostMode(nextVal);
    updateProfileMutation.mutate({
      ghostMode: nextVal,
    });
    toast.info(nextVal ? "Ghost Mode enabled: Activity hidden from friends" : "Ghost Mode disabled: Activity visible");
  };

  const copyPlayoraId = () => {
    const id = (user as any)?.playoraId || (user as any)?.username || `u${user?.id}`;
    navigator.clipboard.writeText(`@${id}`);
    toast.success(`Copied @${id} to clipboard!`);
  };

  const isGoogle = user?.loginMethod === "google" || Boolean(user?.googleId);
  const avatarColors = ["#D6FF3F", "#4285F4", "#F43F5E", "#10B981", "#8B5CF6", "#F59E0B"];

  return (
    <div className="min-h-screen bg-[#050505] text-[#f3f5fa] flex flex-col pb-24 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Card Header */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0e12] p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
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
                  className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-black text-[#050505] shadow-lg"
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

                {/* PlayOra ID with 1-click copy */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={copyPlayoraId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono font-bold text-[#d6ff3f] hover:bg-white/10 transition"
                  >
                    <span>@{ (user as any)?.playoraId || (user as any)?.username || `u${user?.id}` }</span>
                    <Copy size={11} className="text-zinc-400" />
                  </button>
                  <span className="text-xs text-zinc-400">
                    {user?.email || "No email linked"}
                  </span>
                </div>

                {(user as any)?.bio && (
                  <p className="text-xs text-zinc-300 pt-1 italic">
                    "{(user as any).bio}"
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-zinc-500 pt-1">
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
                  setUsername((user as any)?.username || "");
                  setBio((user as any)?.bio || "");
                  setAvatarColor(user?.avatarColor || "#D6FF3F");
                  setIsEditing(!isEditing);
                }}
                className="flex-1 sm:flex-initial border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-xl"
              >
                <Edit2 size={15} className="mr-1.5" />
                <span>{isEditing ? "Cancel" : "Edit Profile"}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
              >
                <LogOut size={16} />
              </Button>
            </div>
          </div>

          {/* Edit Profile Form */}
          {isEditing && (
            <form onSubmit={handleSaveProfile} className="mt-6 border-t border-white/10 pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Display Name
                  </label>
                  <Input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 bg-black/40 border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Username / Handle
                  </label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. cyber_samurai"
                    className="mt-1 bg-black/40 border-white/10 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Bio / Status
                </label>
                <Input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Cinema enthusiast, Twitch chatter, EDM lover"
                  className="mt-1 bg-black/40 border-white/10 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Avatar Accent Color
                </label>
                <div className="flex items-center gap-3 mt-2">
                  {avatarColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarColor(color)}
                      className={`h-8 w-8 rounded-full transition transform active:scale-95 ${
                        avatarColor === color ? "ring-2 ring-white scale-110" : "opacity-80"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateProfileMutation.isPending}
                  className="bg-[#d6ff3f] text-[#050505] font-bold hover:bg-[#c2eb30] rounded-xl px-5"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Privacy & Ghost Mode Controls */}
        <div className="rounded-3xl border border-white/10 bg-[#0d0e12] p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Ghost size={18} className="text-[#d6ff3f]" />
            Privacy & Social Visibility
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ghost Mode Card */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Ghost size={15} className={ghostMode ? "text-[#d6ff3f]" : "text-zinc-500"} />
                  Ghost Mode
                </span>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                  Hide your online presence and current watch party activity from all friends.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleGhostMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  ghostMode ? "bg-[#d6ff3f]" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition ${
                    ghostMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Friend Requests Toggle */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Users size={15} className="text-blue-400" />
                  Allow Friend Requests
                </span>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                  Let other watchers send you friend requests and co-watching invites.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !allowFriendRequests;
                  setAllowFriendRequests(nextVal);
                  updateProfileMutation.mutate({ allowFriendRequests: nextVal });
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  allowFriendRequests ? "bg-[#d6ff3f]" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition ${
                    allowFriendRequests ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-5">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Radio size={14} className="text-[#d6ff3f]" /> Hosted Parties
            </span>
            <p className="text-2xl font-black text-white mt-1">
              {stats?.hostedCount ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-5">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Users size={14} className="text-emerald-400" /> Parties Joined
            </span>
            <p className="text-2xl font-black text-white mt-1">
              {stats?.joinedCount ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-5">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Film size={14} className="text-amber-400" /> Completed
            </span>
            <p className="text-2xl font-black text-white mt-1">
              {stats?.completedCount ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-5">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-400" /> Level
            </span>
            <p className="text-2xl font-black text-white mt-1">
              {stats?.hostedCount && stats.hostedCount > 5 ? "Party Master" : "Watcher"}
            </p>
          </div>
        </div>

        {/* Google Authentication Connect if Guest */}
        {!isGoogle && (
          <div className="rounded-3xl border border-[#4285F4]/30 bg-[#4285F4]/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#8ab4f8]" />
                Link Your Google Account
              </h3>
              <p className="text-xs text-zinc-400 max-w-lg">
                Link Google OAuth to preserve your friends list, watch party history, and custom handle across all devices.
              </p>
            </div>
            <Link href="/login">
              <Button className="bg-[#4285F4] text-white hover:bg-[#3367d6] rounded-xl font-bold text-xs h-10 px-5">
                Sign In With Google
              </Button>
            </Link>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
