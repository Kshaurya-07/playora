import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Waves,
  LayoutDashboard,
  Radio,
  History,
  User as UserIcon,
  LogIn,
  LogOut,
  Menu,
  X,
  Sparkles,
  Activity,
} from "lucide-react";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isGoogle = user?.loginMethod === "google" || Boolean(user?.googleId);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0a0d14]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 select-none transition hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6ff3f] text-[#0a0d14] shadow-[0_0_20px_rgba(214,255,63,0.3)]">
              <Waves size={20} strokeWidth={2.6} />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              playora<span className="text-[#d6ff3f]">.</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4">
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location === "/dashboard"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/parties"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location === "/parties"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Active Parties</span>
            </Link>

            <Link
              href="/history"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location === "/history"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <History size={16} />
              <span>History</span>
            </Link>
          </nav>
        </div>

        {/* Right side Profile & Auth actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 hover:border-[#d6ff3f]/50 hover:bg-white/10 transition"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || "User"}
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-[#d6ff3f]/40"
                  />
                ) : (
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-[#0a0d14]"
                    style={{ backgroundColor: user.avatarColor || "#d6ff3f" }}
                  >
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[120px] truncate font-medium">{user.name || "User"}</span>
                {isGoogle && (
                  <span className="rounded bg-[#4285F4]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#8ab4f8]">
                    Google
                  </span>
                )}
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 h-8 px-2.5"
                title="Log out"
              >
                <LogOut size={16} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button
                  size="sm"
                  className="bg-[#d6ff3f] hover:bg-[#c2ea32] text-[#0a0d14] font-semibold flex items-center gap-1.5 h-8 text-xs shadow-md"
                >
                  <LogIn size={14} />
                  <span>Sign In / Profile</span>
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          {isAuthenticated && user && (
            <Link href="/profile" className="flex items-center">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || "User"}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-[#d6ff3f]/50"
                />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-[#0a0d14]"
                  style={{ backgroundColor: user.avatarColor || "#d6ff3f" }}
                >
                  {(user.name || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#0e121b] px-4 pt-2 pb-4 space-y-1">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
              location === "/dashboard" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/parties"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
              location === "/parties" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>Active Parties</span>
          </Link>

          <Link
            href="/history"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
              location === "/history" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            <History size={18} />
            <span>Watch Party History</span>
          </Link>

          <Link
            href="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
              location === "/profile" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            <UserIcon size={18} />
            <span>My Profile & Account</span>
          </Link>

          <div className="pt-2 border-t border-white/10 mt-2">
            {isAuthenticated ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full justify-start text-red-400 border-red-500/20 hover:bg-red-500/10"
              >
                <LogOut size={16} className="mr-2" />
                Sign Out
              </Button>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-[#d6ff3f] text-[#0a0d14] font-semibold">
                  <LogIn size={16} className="mr-2" />
                  Sign In with Google
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
