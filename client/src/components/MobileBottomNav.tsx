import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { LayoutDashboard, Radio, History, User } from "lucide-react";

export function MobileBottomNav() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Hide on watch party room page to allow maximum video immersion
  if (location.startsWith("/party/")) {
    return null;
  }

  const navItems = [
    {
      label: "Home",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: location === "/dashboard" || location === "/",
    },
    {
      label: "Active",
      href: "/parties",
      icon: Radio,
      active: location === "/parties",
      badge: true,
    },
    {
      label: "History",
      href: "/history",
      icon: History,
      active: location === "/history",
    },
    {
      label: "Profile",
      href: isAuthenticated ? "/profile" : "/login",
      icon: User,
      active: location === "/profile" || location === "/login",
      avatar: user?.avatarUrl,
      avatarColor: user?.avatarColor,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/10 bg-[#0a0d14]/95 backdrop-blur-xl px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[64px] py-1 px-2 rounded-xl transition ${
                item.active
                  ? "text-[#d6ff3f]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="relative flex items-center justify-center">
                {item.avatar && item.active ? (
                  <img
                    src={item.avatar}
                    alt={item.label}
                    className="h-6 w-6 rounded-full object-cover ring-2 ring-[#d6ff3f]"
                  />
                ) : (
                  <Icon size={20} strokeWidth={item.active ? 2.5 : 1.8} />
                )}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${item.active ? "font-bold text-[#d6ff3f]" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
