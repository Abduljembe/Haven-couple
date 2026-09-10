import React, { useEffect, useState } from 'react';
import { LoveBurstEvent } from '../types';

interface LoveBurstOverlayProps {
  bursts: LoveBurstEvent[];
  onRemove: (id: string) => void;
  onInteractiveTap?: (x: number, y: number) => void;
}

interface Particle {
  id: string;
  emoji: string;
  startX: number;
  startY: number;
  driftX: number;
  scale: number;
  rotate: number;
  durationMs: number;
  glowColor: string;
  isSparkle?: boolean;
}

const GLOW_COLORS = [
  'rgba(244, 63, 94, 0.7)',
  'rgba(236, 72, 153, 0.7)',
  'rgba(168, 85, 247, 0.7)',
  'rgba(249, 115, 22, 0.7)',
  'rgba(234, 179, 8, 0.7)',
  'rgba(6, 182, 212, 0.7)',
  'rgba(16, 185, 129, 0.7)',
];

const COMPANION_SPARKLES = ['✨', '⭐', '💫', '💖', '🌟', '🎉'];

export const LoveBurstOverlay: React.FC<LoveBurstOverlayProps> = ({ bursts, onRemove }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (bursts.length === 0) return;

    const latest = bursts[bursts.length - 1];
    const newParticles: Particle[] = [];

    // Main emoji particles (8-12 burst fountain)
    const count = 10;
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 140;
      const driftX = (Math.random() - 0.5) * 160;
      const color = GLOW_COLORS[Math.floor(Math.random() * GLOW_COLORS.length)];
      const isCompanion = i > 6;
      const chosenEmoji = isCompanion 
        ? COMPANION_SPARKLES[Math.floor(Math.random() * COMPANION_SPARKLES.length)]
        : latest.emoji;

      newParticles.push({
        id: `${latest.id}-${i}-${Date.now()}`,
        emoji: chosenEmoji,
        startX: Math.max(8, Math.min(92, latest.x + offsetX)),
        startY: Math.max(30, Math.min(90, latest.y)),
        driftX,
        scale: 0.8 + Math.random() * 0.9,
        rotate: (Math.random() - 0.5) * 70,
        durationMs: 2200 + Math.random() * 800,
        glowColor: color,
        isSparkle: isCompanion,
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);

    const timer = setTimeout(() => {
      onRemove(latest.id);
      setParticles((prev) => prev.filter((p) => !p.id.startsWith(latest.id)));
    }, 3200);

    return () => clearTimeout(timer);
  }, [bursts, onRemove]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute select-none pointer-events-none"
          style={{
            left: `${p.startX}%`,
            top: `${p.startY}%`,
            animation: `floatUpAndFade ${p.durationMs}ms cubic-bezier(0.12, 0.8, 0.32, 1) forwards`,
            filter: `drop-shadow(0 0 12px ${p.glowColor})`,
            fontSize: p.isSparkle ? '24px' : '36px',
            transform: `scale(${p.scale}) rotate(${p.rotate}deg)`,
            ['--drift-x' as any]: `${p.driftX}px`,
          }}
        >
          {p.emoji}
        </div>
      ))}

      <style>{`
        @keyframes floatUpAndFade {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0.4) rotate(0deg);
          }
          15% {
            opacity: 1;
            transform: translate(calc(var(--drift-x, 0px) * 0.3), -80px) scale(1.15) rotate(15deg);
          }
          60% {
            opacity: 0.95;
            transform: translate(calc(var(--drift-x, 0px) * 0.7), -240px) scale(1) rotate(-15deg);
          }
          100% {
            opacity: 0;
            transform: translate(var(--drift-x, 0px), -450px) scale(0.8) rotate(35deg);
          }
        }
      `}</style>
    </div>
  );
};
