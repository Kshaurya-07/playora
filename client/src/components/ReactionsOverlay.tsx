import React, { useEffect, useState } from "react";

export interface ReactionItem {
  emoji: string;
  label: string;
  category: "hype" | "laughter" | "emotion" | "celebrate";
}

export const AVAILABLE_REACTIONS: ReactionItem[] = [
  // Hype & Energy
  { emoji: "🔥", label: "Fire", category: "hype" },
  { emoji: "⚡", label: "Electric", category: "hype" },
  { emoji: "🚀", label: "Rocket", category: "hype" },
  { emoji: "💯", label: "100", category: "hype" },
  { emoji: "🍿", label: "Popcorn", category: "hype" },
  { emoji: "🛸", label: "Cosmic", category: "hype" },

  // Laughter & Fun
  { emoji: "😂", label: "Laugh", category: "laughter" },
  { emoji: "💀", label: "Dead", category: "laughter" },
  { emoji: "🤯", label: "Mindblown", category: "laughter" },
  { emoji: "😱", label: "Shock", category: "laughter" },
  { emoji: "👀", label: "Watching", category: "laughter" },
  { emoji: "🕺", label: "Dance", category: "laughter" },

  // Emotion & Love
  { emoji: "❤️", label: "Heart", category: "emotion" },
  { emoji: "💖", label: "Sparkle Heart", category: "emotion" },
  { emoji: "😭", label: "Cry", category: "emotion" },
  { emoji: "🤩", label: "Star Eyes", category: "emotion" },
  { emoji: "🙌", label: "Praise", category: "emotion" },
  { emoji: "🫡", label: "Salute", category: "emotion" },

  // Celebration & Vibes
  { emoji: "🎉", label: "Party", category: "celebrate" },
  { emoji: "🥳", label: "Celebrate", category: "celebrate" },
  { emoji: "👏", label: "Applause", category: "celebrate" },
  { emoji: "💃", label: "Groove", category: "celebrate" },
  { emoji: "🍻", label: "Cheers", category: "celebrate" },
  { emoji: "✨", label: "Magic", category: "celebrate" },
];

interface FloatingParticle {
  id: number;
  emoji: string;
  left: number; // percentage
  size: number; // px
  duration: number; // seconds
}

interface ReactionsOverlayProps {
  activeReaction: { emoji: string; id: number } | null;
}

export const ReactionsOverlay: React.FC<ReactionsOverlayProps> = ({ activeReaction }) => {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);

  useEffect(() => {
    if (!activeReaction) return;

    // Spawn 5 particles with staggered positions for a vibrant burst
    const newParticles: FloatingParticle[] = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + Math.random(),
      emoji: activeReaction.emoji,
      left: 70 + (Math.random() * 26 - 13), // clustered nicely on right
      size: Math.floor(28 + Math.random() * 22),
      duration: 2.2 + Math.random() * 0.9,
    }));

    setParticles((prev) => [...prev.slice(-30), ...newParticles]);

    const timer = setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
    }, 3200);

    return () => clearTimeout(timer);
  }, [activeReaction]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="reaction-float select-none"
          style={{
            left: `${particle.left}%`,
            fontSize: `${particle.size}px`,
            animationDuration: `${particle.duration}s`,
          }}
        >
          {particle.emoji}
        </span>
      ))}
    </div>
  );
};
