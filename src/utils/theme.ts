export type ThemeId = 'whatsapp' | 'rose' | 'sunset' | 'cosmic' | 'neon' | 'emerald' | 'bubblegum';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  emoji: string;
  tagline: string;
  primaryGradient: string;
  buttonGradient: string;
  canvasBg: string;
  ambientOrbs: string[]; // classes for animated floating ambient light bubbles
  headerBorder: string;
  userBubble: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  auraRing: string;
  glowColor: string;
  swatchColors: [string, string, string];
}

export const THEME_PRESETS: Record<ThemeId, ThemeConfig> = {
  whatsapp: {
    id: 'whatsapp',
    name: 'Haven Dark',
    emoji: '🟢',
    tagline: 'Authentic Haven Black & Emerald Green',
    primaryGradient: 'from-[#00a884] via-[#25d366] to-[#005c4b]',
    buttonGradient: 'bg-[#00a884] hover:bg-[#02906f] text-white shadow-emerald-950/40',
    canvasBg: 'bg-[#0b141a]',
    ambientOrbs: [
      'bg-[#00a884]/15',
      'bg-[#25d366]/10',
      'bg-[#005c4b]/15',
    ],
    headerBorder: 'border-[#222e35]',
    userBubble: 'bg-[#005c4b] text-[#e9edef] shadow-black/20',
    accentText: 'text-[#25d366]',
    accentBg: 'bg-[#00a884]/15',
    accentBorder: 'border-[#00a884]/30',
    auraRing: 'ring-[#25d366]',
    glowColor: '#25d366',
    swatchColors: ['#0b141a', '#00a884', '#005c4b'],
  },
  rose: {
    id: 'rose',
    name: 'Rose Velvet',
    emoji: '💖',
    tagline: 'Warm, romantic & tender',
    primaryGradient: 'from-rose-500 via-pink-500 to-rose-600',
    buttonGradient: 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-rose-500/25',
    canvasBg: 'bg-rose-50/30',
    ambientOrbs: [
      'bg-rose-300/20',
      'bg-pink-300/20',
      'bg-red-200/20',
    ],
    headerBorder: 'border-rose-100/80',
    userBubble: 'bg-gradient-to-br from-rose-500 via-rose-500 to-pink-500 text-white shadow-rose-500/20',
    accentText: 'text-rose-600',
    accentBg: 'bg-rose-50',
    accentBorder: 'border-rose-200',
    auraRing: 'ring-rose-400',
    glowColor: '#f43f5e',
    swatchColors: ['#f43f5e', '#ec4899', '#fda4af'],
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    emoji: '🌅',
    tagline: 'Golden hour amber & coral warmth',
    primaryGradient: 'from-amber-500 via-orange-500 to-rose-500',
    buttonGradient: 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 shadow-amber-500/25',
    canvasBg: 'bg-amber-50/30',
    ambientOrbs: [
      'bg-amber-300/20',
      'bg-orange-300/20',
      'bg-rose-300/20',
    ],
    headerBorder: 'border-amber-100/80',
    userBubble: 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-orange-500/20',
    accentText: 'text-orange-600',
    accentBg: 'bg-orange-50',
    accentBorder: 'border-orange-200',
    auraRing: 'ring-orange-400',
    glowColor: '#f97316',
    swatchColors: ['#f59e0b', '#f97316', '#f43f5e'],
  },
  cosmic: {
    id: 'cosmic',
    name: 'Cosmic Starlight',
    emoji: '🌌',
    tagline: 'Deep midnight violet & celestial dreams',
    primaryGradient: 'from-indigo-600 via-purple-600 to-pink-600',
    buttonGradient: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25',
    canvasBg: 'bg-slate-900/5',
    ambientOrbs: [
      'bg-indigo-400/15',
      'bg-purple-400/15',
      'bg-fuchsia-400/15',
    ],
    headerBorder: 'border-indigo-100/80',
    userBubble: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-purple-500/25',
    accentText: 'text-purple-600',
    accentBg: 'bg-purple-50',
    accentBorder: 'border-purple-200',
    auraRing: 'ring-purple-400',
    glowColor: '#9333ea',
    swatchColors: ['#4f46e5', '#9333ea', '#db2777'],
  },
  neon: {
    id: 'neon',
    name: 'Cyberpop Neon',
    emoji: '⚡',
    tagline: 'Electric fuchsia, cyan & dynamic energy',
    primaryGradient: 'from-fuchsia-500 via-violet-600 to-cyan-500',
    buttonGradient: 'bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-fuchsia-600 hover:to-cyan-600 shadow-fuchsia-500/25',
    canvasBg: 'bg-fuchsia-50/20',
    ambientOrbs: [
      'bg-fuchsia-300/20',
      'bg-cyan-300/20',
      'bg-violet-300/20',
    ],
    headerBorder: 'border-fuchsia-100/80',
    userBubble: 'bg-gradient-to-br from-fuchsia-500 via-violet-600 to-cyan-500 text-white shadow-fuchsia-500/25',
    accentText: 'text-fuchsia-600',
    accentBg: 'bg-fuchsia-50',
    accentBorder: 'border-fuchsia-200',
    auraRing: 'ring-fuchsia-400',
    glowColor: '#d946ef',
    swatchColors: ['#d946ef', '#7c3aed', '#06b6d4'],
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Oasis',
    emoji: '🌿',
    tagline: 'Soothing mint, jade & tranquil botanicals',
    primaryGradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    buttonGradient: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/25',
    canvasBg: 'bg-emerald-50/25',
    ambientOrbs: [
      'bg-emerald-300/20',
      'bg-teal-300/20',
      'bg-cyan-300/20',
    ],
    headerBorder: 'border-emerald-100/80',
    userBubble: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-emerald-500/20',
    accentText: 'text-emerald-700',
    accentBg: 'bg-emerald-50',
    accentBorder: 'border-emerald-200',
    auraRing: 'ring-emerald-400',
    glowColor: '#10b981',
    swatchColors: ['#10b981', '#14b8a6', '#06b6d4'],
  },
  bubblegum: {
    id: 'bubblegum',
    name: 'Cotton Candy',
    emoji: '🍬',
    tagline: 'Pastel lilac, sweet peach & playful joy',
    primaryGradient: 'from-pink-400 via-purple-400 to-sky-400',
    buttonGradient: 'bg-gradient-to-r from-pink-400 via-purple-400 to-sky-400 hover:opacity-95 text-white shadow-pink-400/25',
    canvasBg: 'bg-pink-50/30',
    ambientOrbs: [
      'bg-pink-300/20',
      'bg-purple-300/20',
      'bg-sky-300/20',
    ],
    headerBorder: 'border-pink-100/80',
    userBubble: 'bg-gradient-to-br from-pink-400 via-purple-400 to-sky-400 text-white shadow-pink-400/20',
    accentText: 'text-pink-600',
    accentBg: 'bg-pink-50',
    accentBorder: 'border-pink-200',
    auraRing: 'ring-pink-300',
    glowColor: '#ec4899',
    swatchColors: ['#f472b6', '#c084fc', '#38bdf8'],
  },
};

export type ColorMode = 'light' | 'dark';

export function getSavedColorMode(): ColorMode {
  try {
    const saved = localStorage.getItem('haven_color_mode');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {}
  return 'dark';
}

export function saveColorMode(mode: ColorMode) {
  try {
    localStorage.setItem('haven_color_mode', mode);
  } catch {}
}

export function getSavedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem('haven_app_theme');
    if (saved && saved in THEME_PRESETS) {
      return saved as ThemeId;
    }
  } catch {}
  return 'whatsapp';
}

export function saveTheme(themeId: ThemeId) {
  try {
    localStorage.setItem('haven_app_theme', themeId);
  } catch {}
}
