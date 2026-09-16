import React, { useEffect, useState } from "react";

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

    // Spawn 5 particles with staggered positions for a festive burst
    const newParticles: FloatingParticle[] = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + Math.random(),
      emoji: activeReaction.emoji,
      left: 70 + (Math.random() * 25 - 12), // clustered on bottom-right
      size: Math.floor(28 + Math.random() * 20),
      duration: 2.2 + Math.random() * 0.8,
    }));

    setParticles((prev) => [...prev, ...newParticles]);

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
