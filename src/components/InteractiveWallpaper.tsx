import React, { useEffect, useRef, useMemo } from 'react';
import {
  WallpaperSettings,
  WALLPAPER_CATALOG,
  getSvgForPattern,
  ParticleType,
} from '../utils/wallpaper';

interface InteractiveWallpaperProps {
  settings: WallpaperSettings;
  className?: string;
  children?: React.ReactNode;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  decay: number;
  rotation: number;
  vRot: number;
  color: string;
  type: ParticleType;
  char?: string;
}

export const InteractiveWallpaper: React.FC<InteractiveWallpaperProps> = ({
  settings,
  className = '',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);

  const activeWallpaper = useMemo(() => {
    return (
      WALLPAPER_CATALOG.find((w) => w.id === settings.selectedId) ||
      WALLPAPER_CATALOG[0]
    );
  }, [settings.selectedId]);

  // Generate SVG Data URI for background pattern
  const patternDataUri = useMemo(() => {
    const rawSvg = getSvgForPattern(activeWallpaper.patternType);
    if (!rawSvg || activeWallpaper.patternType === 'none') return null;

    // Substitute doodleColor
    const coloredSvg = rawSvg.replace(
      /currentColor/g,
      activeWallpaper.doodleColor
    );
    const encoded = encodeURIComponent(coloredSvg.trim());
    return `url("data:image/svg+xml,${encoded}")`;
  }, [activeWallpaper.patternType, activeWallpaper.doodleColor]);

  // Particle System Canvas
  useEffect(() => {
    if (!settings.interactiveParticles) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      particlesRef.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(container);

    // Particle rendering loop
    const render = () => {
      const rect = container.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.x < -20 || p.x > rect.width + 20 || p.y < -20 || p.y > rect.height + 20) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);

        if (p.type === 'hearts') {
          // Draw sweet mini vector heart
          ctx.fillStyle = p.color;
          const s = p.size;
          ctx.beginPath();
          ctx.moveTo(0, s / 4);
          ctx.quadraticCurveTo(0, 0, s / 4, 0);
          ctx.quadraticCurveTo(s / 2, 0, s / 2, s / 3);
          ctx.quadraticCurveTo(s / 2, 0, (s * 3) / 4, 0);
          ctx.quadraticCurveTo(s, 0, s, s / 4);
          ctx.quadraticCurveTo(s, s / 2, (s * 3) / 4, (s * 3) / 4);
          ctx.lineTo(s / 2, s);
          ctx.lineTo(s / 4, (s * 3) / 4);
          ctx.quadraticCurveTo(0, s / 2, 0, s / 4);
          ctx.closePath();
          ctx.fill();
        } else if (p.type === 'stars') {
          // Draw 4-point sparkle star
          ctx.fillStyle = p.color;
          const r = p.size;
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.quadraticCurveTo(0, 0, 0, r);
          ctx.quadraticCurveTo(0, 0, -r, 0);
          ctx.quadraticCurveTo(0, 0, 0, -r);
          ctx.closePath();
          ctx.fill();
        } else if (p.type === 'bubbles') {
          // Draw gentle iridescent bubble
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.stroke();
          // Highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.beginPath();
          ctx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.25, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Sparks: warm glowing circular ember
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (particles.length > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        animFrameRef.current = null;
      }
    };

    const ensureAnimating = () => {
      if (!animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    // Spawn helper
    const spawnParticle = (
      x: number,
      y: number,
      count = 1,
      spread = 8
    ) => {
      const type = settings.particleType || 'hearts';
      const heartColors = ['#f43f5e', '#ec4899', '#fb7185', '#fda4af', '#f472b6'];
      const sparkColors = ['#f59e0b', '#fbbf24', '#fcd34d', '#f97316', '#ffedd5'];
      const starColors = ['#60a5fa', '#a78bfa', '#f472b6', '#38bdf8', '#ffffff'];
      const bubbleColors = ['#a5f3fc', '#c4b5fd', '#fbcfe8', '#bae6fd'];

      let palette = heartColors;
      if (type === 'sparks') palette = sparkColors;
      else if (type === 'stars') palette = starColors;
      else if (type === 'bubbles') palette = bubbleColors;

      for (let i = 0; i < count; i++) {
        const color = palette[Math.floor(Math.random() * palette.length)];
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 1.5 + 0.4) * (spread > 10 ? 1.8 : 1);

        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * spread,
          y: y + (Math.random() - 0.5) * spread,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (type === 'bubbles' || type === 'hearts' ? 0.6 : 0),
          size: type === 'bubbles' ? Math.random() * 8 + 6 : Math.random() * 8 + 7,
          alpha: 0.9,
          maxAlpha: 0.9,
          decay: Math.random() * 0.015 + 0.012,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.06,
          color,
          type,
        });
      }

      // Cap particles to 80 for smooth 60fps performance
      if (particlesRef.current.length > 80) {
        particlesRef.current.splice(0, particlesRef.current.length - 80);
      }

      ensureAnimating();
    };

    // Pointer move listener
    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      // Throttle pointer move spawns to every 45ms
      if (now - lastSpawnRef.current < 45) return;
      lastSpawnRef.current = now;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spawnParticle(x, y, 1, 6);
    };

    // Click / tap burst listener
    const handlePointerDown = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Burst of 6-8 particles
      spawnParticle(x, y, 6, 20);
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerdown', handlePointerDown);
      resizeObserver.disconnect();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [settings.interactiveParticles, settings.particleType]);

  // Compute base styling
  const isCustomImage = settings.selectedId === 'custom' && settings.customImageUrl;
  const computedBg = isCustomImage
    ? `url("${settings.customImageUrl}")`
    : settings.customBgColor || activeWallpaper.bgColor;

  return (
    <div
      ref={containerRef}
      id="haven-interactive-wallpaper-container"
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{
        backgroundColor: !isCustomImage ? computedBg : undefined,
        backgroundImage: isCustomImage ? computedBg : undefined,
        backgroundSize: isCustomImage ? 'cover' : undefined,
        backgroundPosition: isCustomImage ? 'center' : undefined,
      }}
    >
      {/* Repeating SVG Doodle Pattern Layer (WhatsApp Style) */}
      {patternDataUri && (
        <div
          id="wallpaper-doodle-pattern"
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
          style={{
            backgroundImage: patternDataUri,
            backgroundRepeat: 'repeat',
            backgroundSize: '240px 240px',
            opacity: settings.doodleOpacity,
            mixBlendMode: activeWallpaper.isDark ? 'screen' : 'multiply',
          }}
        />
      )}

      {/* Dimming / Darkness Overlay Layer */}
      {settings.dimming > 0 && (
        <div
          id="wallpaper-dimming-overlay"
          className="absolute inset-0 pointer-events-none z-1 transition-opacity duration-200"
          style={{
            backgroundColor: '#000000',
            opacity: settings.dimming,
          }}
        />
      )}

      {/* Interactive Touch & Cursor Particle Sparks Canvas */}
      <canvas
        ref={canvasRef}
        id="wallpaper-interactive-canvas"
        className="absolute inset-0 pointer-events-none z-2"
      />

      {/* Foreground Content (Chat Stream, Composer, etc.) */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>
    </div>
  );
};
