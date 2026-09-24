import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Waves,
  Sparkles,
  ShieldCheck,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  Tv,
} from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, refresh } = useAuth();
  const [guestName, setGuestName] = useState("");
  const [guestAvatarColor, setGuestAvatarColor] = useState("#D6FF3F");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated and has a persistent name, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && user?.loginMethod === "google") {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, user, setLocation]);

  const googleLoginMutation = trpc.auth.googleLogin.useMutation({
    onSuccess: async (data) => {
      toast.success(`Welcome back, ${data.user.name || "Explorer"}!`, {
        description: "Successfully signed in with Google.",
      });
      await refresh();
      setLocation("/dashboard");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to sign in with Google.");
      setIsSubmitting(false);
    },
  });

  const guestLoginMutation = trpc.auth.guestLogin.useMutation({
    onSuccess: async (data) => {
      toast.success(`Welcome, ${data.name}!`, {
        description: "Entered as guest session.",
      });
      await refresh();
      setLocation("/dashboard");
    },
    onError: (err) => {
      toast.error(err.message || "Guest sign-in failed.");
      setIsSubmitting(false);
    },
  });

  // Google Sign-In SDK Initialization (if VITE_GOOGLE_CLIENT_ID is provided)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) return;

    // Dynamically load Google Identity Services script if not already present
    if (!document.getElementById("google-gsi-client")) {
      const script = document.createElement("script");
      script.id = "google-gsi-client";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleGsi();
      document.body.appendChild(script);
    } else {
      initGoogleGsi();
    }

    function initGoogleGsi() {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            if (response.credential) {
              setIsSubmitting(true);
              googleLoginMutation.mutate({ credential: response.credential });
            }
          },
        });
        const buttonDiv = document.getElementById("google-button-container");
        if (buttonDiv) {
          (window as any).google.accounts.id.renderButton(buttonDiv, {
            theme: "filled_blue",
            size: "large",
            text: "continue_with",
            shape: "pill",
            width: 320,
          });
        }
      }
    }
  }, [googleClientId]);

  // Demo Google Sign-In (for instant local / preview use without external OAuth keys)
  const handleQuickGoogleSignIn = (emailPrefix = "alex") => {
    setIsSubmitting(true);
    const mockGoogleId = "109823471092834";
    googleLoginMutation.mutate({
      profile: {
        googleId: mockGoogleId,
        email: `${emailPrefix}.playora@gmail.com`,
        name: `${emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)} Rivers`,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailPrefix}`,
      },
    });
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    guestLoginMutation.mutate({
      name: guestName.trim() || undefined,
      avatarColor: guestAvatarColor,
    });
  };

  const avatarColors = ["#D6FF3F", "#4285F4", "#F43F5E", "#10B981", "#8B5CF6", "#F59E0B"];

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col justify-between relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#d6ff3f]/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#4285f4]/10 blur-[130px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2.5 select-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6ff3f] text-[#0a0d14] shadow-[0_0_20px_rgba(214,255,63,0.3)]">
            <Waves size={20} strokeWidth={2.6} />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">
            playora<span className="text-[#d6ff3f]">.</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/dashboard")}
          className="text-zinc-400 hover:text-white"
        >
          Skip to Dashboard
        </Button>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        <div className="w-full max-w-md bg-[#0d111b]/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d6ff3f]/10 border border-[#d6ff3f]/20 text-[#d6ff3f] text-xs font-semibold">
              <Sparkles size={13} />
              <span>Watch Together Anywhere</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Sign In to PlayOra
            </h1>
            <p className="text-sm text-zinc-400">
              Create and join synchronized watch parties across YouTube, Twitch, Netflix & more.
            </p>
          </div>

          {/* Google Sign-In Section */}
          <div className="space-y-3 pt-2">
            {googleClientId ? (
              <div id="google-button-container" className="flex justify-center min-h-[44px]" />
            ) : null}

            {/* Standard Branded Google Button */}
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickGoogleSignIn("alex")}
              className="w-full h-12 rounded-xl bg-white hover:bg-zinc-100 text-[#1f1f1f] font-semibold flex items-center justify-center gap-3 border border-zinc-200 shadow-md transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </Button>

            <div className="flex items-center gap-2 text-xs text-zinc-400 justify-center">
              <ShieldCheck size={14} className="text-[#34a853]" />
              <span>Secure OIDC authentication • No password required</span>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#0d111b] px-3 text-xs uppercase text-zinc-500 font-medium tracking-wider">
              Or guest mode
            </span>
          </div>

          {/* Guest Form */}
          <form onSubmit={handleGuestSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Display Name</label>
              <div className="relative">
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. MovieBuff_99"
                  maxLength={32}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-[#d6ff3f] h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Avatar Color Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Avatar Tone</label>
              <div className="flex items-center gap-2.5">
                {avatarColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setGuestAvatarColor(color)}
                    style={{ backgroundColor: color }}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      guestAvatarColor === color ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0d111b]" : "opacity-80 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium border border-white/15 transition flex items-center justify-center gap-2"
            >
              <span>Continue as Guest</span>
              <ArrowRight size={16} />
            </Button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-zinc-400 border-t border-white/5 relative z-10">
        PlayOra Universal Watch Party Platform &copy; 2026. All rights reserved.
      </footer>
    </div>
  );
}
