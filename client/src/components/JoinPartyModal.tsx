import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { X, ArrowRight, Radio, Sparkles } from "lucide-react";

interface JoinPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinPartyModal({ isOpen, onClose }: JoinPartyModalProps) {
  const [, setLocation] = useLocation();
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setJoinCodeInput("");
    }
  }, [isOpen]);

  const handleJoinParty = () => {
    let cleanCode = joinCodeInput.trim().toUpperCase();
    if (cleanCode.includes("/PARTY/")) {
      cleanCode = cleanCode.split("/PARTY/")[1]?.split("?")[0] || cleanCode;
    }
    if (!cleanCode) {
      toast.error("Please enter an invite code or party link");
      return;
    }
    onClose();
    setLocation(`/party/${cleanCode}`);
  };

  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleJoinParty();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-party-title"
    >
      <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-white/[.15] bg-[#0c101a] shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0c101a]/95 px-5 py-4 backdrop-blur-md">
          <div>
            <h2 id="join-party-title" className="text-lg font-extrabold text-white flex items-center gap-2">
              <Radio size={18} className="text-[#d6ff3f]" />
              Join a Watch Party
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400">
              Paste the invite code or complete PlayOra room link.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-5 py-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Room Code or Invite URL
            </label>
            <Input
              ref={inputRef}
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              onKeyDown={handleKeyDownInput}
              placeholder="e.g. 7K4MZ2P9 or playora.app/party/..."
              className="mt-2 h-13 border-white/15 bg-black/40 text-center font-mono text-base uppercase tracking-widest text-white focus:border-[#d6ff3f]"
            />
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] text-neutral-400">
            <span className="font-semibold text-neutral-300">Tip:</span> You can paste an invite link directly into your browser's address bar or enter the code above to connect instantly.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-[#0c101a]/95 px-5 py-3.5 backdrop-blur-md">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="h-9 rounded-xl border-white/10 text-xs font-bold text-neutral-300 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleJoinParty}
            className="h-9 rounded-xl bg-[#d6ff3f] px-5 text-xs font-extrabold text-black hover:bg-[#e1ff70] shadow-md shadow-[#d6ff3f]/15"
          >
            Join Party <ArrowRight size={14} className="ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
