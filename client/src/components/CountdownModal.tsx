import React from "react";
import { Timer } from "lucide-react";

interface CountdownModalProps {
  count: number;
  message?: string;
  onDismiss?: () => void;
}

export const CountdownModal: React.FC<CountdownModalProps> = ({ count, message }) => {
  if (count <= 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="flex items-center gap-2 rounded-full border border-[#d6ff3f]/30 bg-[#d6ff3f]/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-[#d6ff3f]">
          <Timer size={16} />
          <span>Synchronized Playback Start</span>
        </div>

        <div className="mt-6 font-mono text-8xl font-black text-white animate-bounce md:text-9xl drop-shadow-[0_10px_40px_rgba(214,255,63,0.3)]">
          {count}
        </div>

        <p className="mt-4 text-base font-bold text-neutral-300">
          {message || `Press Play on your service when the countdown hits 1!`}
        </p>
      </div>
    </div>
  );
};
