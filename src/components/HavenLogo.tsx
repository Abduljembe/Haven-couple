import React from 'react';

interface HavenLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'couple' | 'friends' | 'default';
  className?: string;
  isDark?: boolean;
}

export const HavenLogo: React.FC<HavenLogoProps> = ({
  size = 'md',
  showText = false,
  variant = 'default',
  className = '',
  isDark = false,
}) => {
  const sizeMap = {
    xs: { icon: 20, text: 'text-xs', sub: 'text-[8px]' },
    sm: { icon: 28, text: 'text-sm', sub: 'text-[9px]' },
    md: { icon: 38, text: 'text-base', sub: 'text-[10px]' },
    lg: { icon: 48, text: 'text-xl', sub: 'text-xs' },
    xl: { icon: 64, text: 'text-2xl', sub: 'text-sm' },
  };

  const dim = sizeMap[size];

  // Gradient configurations by variant
  const gradientId = `haven-grad-${variant}-${size}`;
  const glowId = `haven-glow-${variant}-${size}`;

  const colors =
    variant === 'friends'
      ? { start: '#6366f1', mid: '#a855f7', end: '#ec4899', aura: 'rgba(99, 102, 241, 0.25)' }
      : { start: '#f43f5e', mid: '#ec4899', end: '#a855f7', aura: 'rgba(244, 63, 94, 0.25)' };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`} id="haven-brand-logo">
      {/* Visual Vector Icon Mark */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-105"
        style={{ width: dim.icon, height: dim.icon }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            <linearGradient id={gradientId} x1="10%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor={colors.start} />
              <stop offset="50%" stopColor={colors.mid} />
              <stop offset="100%" stopColor={colors.end} />
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Sanctuary Shield / Heart Haven Base */}
          <rect
            x="8"
            y="8"
            width="84"
            height="84"
            rx="24"
            fill={`url(#${gradientId})`}
            fillOpacity="0.12"
            stroke={`url(#${gradientId})`}
            strokeWidth="3.5"
            strokeDasharray="120 4"
          />

          {/* Left Sanctuary Arc (Pillar 1) */}
          <path
            d="M32 26 C32 26 28 44 28 56 C28 68 38 74 48 76 C42 66 38 52 38 42 C38 32 44 26 44 26"
            fill={`url(#${gradientId})`}
            opacity="0.9"
          />

          {/* Right Sanctuary Arc (Pillar 2 / Mirror) */}
          <path
            d="M68 26 C68 26 72 44 72 56 C72 68 62 74 52 76 C58 66 62 52 62 42 C62 32 56 26 56 26"
            fill={`url(#${gradientId})`}
            opacity="0.9"
          />

          {/* Central Connecting Infinite Heart Knot */}
          <path
            d="M50 38 C44 30 35 32 35 40 C35 48 45 56 50 62 C55 56 65 48 65 40 C65 32 56 30 50 38 Z"
            fill={`url(#${gradientId})`}
            filter={`url(#${glowId})`}
          />

          {/* Security & Spark Accent Core */}
          <circle cx="50" cy="43" r="3.5" fill="#ffffff" className="animate-pulse" />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col text-left leading-none">
          <div className="flex items-center gap-1">
            <span
              className={`font-serif font-black tracking-tight ${dim.text} ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              HAVEN
            </span>
            <span
              className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                variant === 'friends'
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                  : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
              }`}
            >
              {variant === 'friends' ? 'Squad' : 'Private'}
            </span>
          </div>
          <span className={`font-medium ${dim.sub} mt-0.5 tracking-wider uppercase opacity-70 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            End-to-End Encrypted Space
          </span>
        </div>
      )}
    </div>
  );
};
