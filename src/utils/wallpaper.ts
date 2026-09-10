// WhatsApp-Style Chat Backgrounds & Interactive Wallpaper Engine

export type PatternType = 'whatsapp-classic' | 'whatsapp-romantic' | 'celestial' | 'botanical' | 'geometric' | 'none';
export type ParticleType = 'hearts' | 'sparks' | 'stars' | 'bubbles';

export interface WallpaperConfig {
  id: string;
  name: string;
  category: 'whatsapp' | 'romantic' | 'nature' | 'dark' | 'solid';
  bgColor: string; // CSS background value (hex, gradient, etc.)
  patternType: PatternType;
  doodleColor: string; // Hex color for the SVG doodles
  defaultOpacity: number; // 0.0 to 1.0
  isDark: boolean;
  tagline: string;
  previewBg: string;
  accentBubble: string;
}

export interface WallpaperSettings {
  selectedId: string;
  doodleOpacity: number; // 0.0 to 1.0 (WhatsApp dimming/intensity)
  interactiveParticles: boolean;
  particleType: ParticleType;
  dimming: number; // 0.0 to 0.7
  customImageUrl?: string | null;
  customBgColor?: string | null;
}

// WhatsApp Authentic Classic Doodle SVG (crisp 260x260 seamless repeat pattern)
export const WHATSAPP_CLASSIC_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">
  <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <!-- Chat Bubble -->
    <path d="M22 34 h26 a6 6 0 0 1 6 6 v14 a6 6 0 0 1 -6 6 h-18 l-8 7 v-7 h0 a6 6 0 0 1 -0 -0 z" />
    <circle cx="32" cy="47" r="1.5" fill="currentColor" />
    <circle cx="38" cy="47" r="1.5" fill="currentColor" />
    <circle cx="44" cy="47" r="1.5" fill="currentColor" />

    <!-- Coffee Cup -->
    <path d="M120 28 h22 v16 a8 8 0 0 1 -8 8 h-6 a8 8 0 0 1 -8 -8 v-16 z" />
    <path d="M142 34 h4 a4 4 0 0 1 4 4 v2 a4 4 0 0 1 -4 4 h-4" />
    <path d="M126 22 c0 -4 4 -4 4 -7" />
    <path d="M134 22 c0 -4 4 -4 4 -7" />

    <!-- Star -->
    <polygon points="210,20 214,29 224,30 216,37 219,47 210,41 201,47 204,37 196,30 206,29" />

    <!-- Headphones -->
    <path d="M24 120 a16 16 0 0 1 32 0 v14" />
    <rect x="20" y="130" width="8" height="14" rx="3" />
    <rect x="52" y="130" width="8" height="14" rx="3" />

    <!-- Camera -->
    <rect x="106" y="112" width="34" height="24" rx="5" />
    <circle cx="123" cy="124" r="6" />
    <circle cx="132" cy="117" r="1.5" fill="currentColor" />
    <path d="M116 112 l3 -5 h8 l3 5" />

    <!-- Paper Airplane -->
    <path d="M190 115 l35 -14 l-14 35 l-8 -12 l-13 -9 z" />
    <path d="M203 124 l10 -15" />

    <!-- Smiling Cat Face -->
    <circle cx="38" cy="216" r="14" />
    <polygon points="28,206 25,196 35,203" />
    <polygon points="48,206 51,196 41,203" />
    <circle cx="33" cy="214" r="1.5" fill="currentColor" />
    <circle cx="43" cy="214" r="1.5" fill="currentColor" />
    <path d="M35 220 q3 3 6 0" />

    <!-- Music Notes -->
    <path d="M118 200 v20 a4 4 0 1 1 -4 -4 h4 v-16 h14 v16 a4 4 0 1 1 -4 -4 h4 v-12 z" />

    <!-- Game Controller -->
    <rect x="186" y="196" width="36" height="22" rx="7" />
    <path d="M195 204 v6" />
    <path d="M192 207 h6" />
    <circle cx="212" cy="204" r="1.5" fill="currentColor" />
    <circle cx="216" cy="209" r="1.5" fill="currentColor" />

    <!-- Bicycle -->
    <circle cx="78" cy="80" r="8" />
    <circle cx="102" cy="80" r="8" />
    <path d="M78 80 l10 -14 h8 l6 14 m-6 -14 l-5 14 h-9" />
    <path d="M93 63 h6" />

    <!-- Heart -->
    <path d="M165 72 a5 5 0 0 0 -7 7 l7 7 l7 -7 a5 5 0 0 0 -7 -7 z" />

    <!-- Lightbulb -->
    <path d="M234 76 a8 8 0 0 0 -14 0 c0 4 3 6 3 9 h8 c0 -3 3 -5 3 -9 z" />
    <path d="M224 88 h6" />

    <!-- Clock -->
    <circle cx="82" cy="164" r="11" />
    <path d="M82 158 v6 h4" />

    <!-- Little Gift Box -->
    <rect x="156" y="156" width="18" height="18" rx="2" />
    <path d="M156 163 h18" />
    <path d="M165 156 v18" />
    <path d="M162 153 q3 3 3 3 q0 -3 3 -3" />

    <!-- Pizza Slice -->
    <path d="M232 152 l-16 18 a20 20 0 0 1 20 -4 z" />
    <circle cx="228" cy="158" r="1" fill="currentColor" />

    <!-- Crescent Moon -->
    <path d="M72 236 a10 10 0 1 0 12 -12 a12 12 0 0 1 -12 12 z" />

    <!-- Tiny accents & sparkles -->
    <circle cx="60" cy="30" r="1.5" fill="currentColor" />
    <circle cx="170" cy="24" r="1.5" fill="currentColor" />
    <circle cx="12" cy="85" r="1" fill="currentColor" />
    <circle cx="150" cy="110" r="1" fill="currentColor" />
    <circle cx="248" cy="122" r="1.5" fill="currentColor" />
    <circle cx="10" cy="170" r="1.5" fill="currentColor" />
    <circle cx="140" cy="180" r="1" fill="currentColor" />
    <circle cx="130" cy="240" r="1.5" fill="currentColor" />
    <circle cx="240" cy="240" r="1" fill="currentColor" />
    <path d="M174 78 l2 2 m0 -2 l-2 2" />
    <path d="M88 126 l3 3 m0 -3 l-3 3" />
  </g>
</svg>
`;

// WhatsApp Romantic / Couple Edition SVG
export const WHATSAPP_ROMANTIC_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">
  <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <!-- Intertwined Double Hearts -->
    <path d="M30 30 a6 6 0 0 0 -8.5 8.5 l8.5 8.5 l8.5 -8.5 a6 6 0 0 0 -8.5 -8.5 z" />
    <path d="M44 38 a6 6 0 0 0 -8.5 8.5 l8.5 8.5 l8.5 -8.5 a6 6 0 0 0 -8.5 -8.5 z" />

    <!-- Love Letter with Heart Seal -->
    <rect x="114" y="24" width="30" height="20" rx="3" />
    <path d="M114 24 l15 11 l15 -11" />
    <circle cx="129" cy="34" r="2.5" fill="currentColor" />

    <!-- Diamond Engagement Ring -->
    <circle cx="214" cy="36" r="9" />
    <polygon points="214,19 219,25 214,28 209,25" />

    <!-- Clinking Wine Glasses -->
    <path d="M28 114 l6 10 v8 m-4 0 h8" />
    <path d="M26 114 q7 3 10 0" />
    <path d="M46 114 l-6 10 v8 m-4 0 h8" />
    <path d="M40 114 q7 3 10 0" />
    <path d="M36 106 l1 2 m-1 -2 l-1 2" />

    <!-- Polaroid Photo with Heart Inside -->
    <rect x="112" y="108" width="28" height="34" rx="3" />
    <rect x="116" y="112" width="20" height="18" rx="2" />
    <path d="M126 118 a2.5 2.5 0 0 0 -3.5 3.5 l3.5 3.5 l3.5 -3.5 a2.5 2.5 0 0 0 -3.5 -3.5 z" />

    <!-- Cupid's Arrow with Heart Target -->
    <path d="M188 136 l36 -26" />
    <path d="M188 136 l6 -1 m-6 1 l1 -6" />
    <path d="M224 110 l-4 8 m4 -8 l-8 4" />
    <path d="M206 123 a4 4 0 0 0 -5.6 5.6 l5.6 5.6 l5.6 -5.6 a4 4 0 0 0 -5.6 -5.6 z" />

    <!-- Heart-Shaped Lock & Key -->
    <path d="M30 200 v-6 a6 6 0 0 1 12 0 v6" />
    <path d="M36 200 a9 9 0 0 0 -7 13 l7 7 l7 -7 a9 9 0 0 0 -7 -13 z" />
    <circle cx="36" cy="207" r="1.5" fill="currentColor" />

    <!-- Blooming Rose -->
    <path d="M120 200 c-3 -8 8 -12 12 -4 c4 -8 15 -4 12 4 c0 8 -12 14 -12 14 s-12 -6 -12 -14 z" />
    <path d="M132 214 v16 m0 -8 q6 -4 8 0" />

    <!-- Infinity Symbol with Heart Accent -->
    <path d="M188 214 q8 -10 16 0 q8 10 16 0 q-8 -10 -16 0 q-8 10 -16 0 z" />
    <path d="M204 200 a3 3 0 0 0 -4.2 4.2 l4.2 4.2 l4.2 -4.2 a3 3 0 0 0 -4.2 -4.2 z" />

    <!-- Floating Sweet Confection / Cupcake -->
    <path d="M72 72 h20 l-2 14 h-16 z" />
    <path d="M70 72 c0 -6 6 -8 12 -8 c6 0 12 2 12 8 z" />
    <circle cx="82" cy="62" r="2" fill="currentColor" />

    <!-- Little Love Pad / Diary -->
    <rect x="156" y="66" width="22" height="26" rx="3" />
    <path d="M162 66 v26" />
    <path d="M167 74 h6" />
    <path d="M167 80 h4" />

    <!-- Moon & Starry Sparkles -->
    <path d="M74 162 a10 10 0 1 0 12 -12 a12 12 0 0 1 -12 12 z" />
    <polygon points="96,154 98,159 103,160 99,164 100,169 96,166 92,169 93,164 89,160 94,159" />

    <!-- Little Sparkle Bursts -->
    <circle cx="16" cy="74" r="1.5" fill="currentColor" />
    <circle cx="238" cy="74" r="1.5" fill="currentColor" />
    <circle cx="70" cy="120" r="1.5" fill="currentColor" />
    <circle cx="160" cy="126" r="1" fill="currentColor" />
    <circle cx="170" cy="176" r="1.5" fill="currentColor" />
    <circle cx="238" cy="176" r="1" fill="currentColor" />
    <circle cx="74" cy="240" r="1.5" fill="currentColor" />
    <circle cx="166" cy="238" r="1" fill="currentColor" />
    <path d="M84 28 l2 2 m0 -2 l-2 2" />
    <path d="M176 34 l3 3 m0 -3 l-3 3" />
    <path d="M226 230 l2 2 m0 -2 l-2 2" />
  </g>
</svg>
`;

// Celestial / Galaxy Stars Pattern SVG
export const CELESTIAL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Crescent Moon -->
    <path d="M30 40 a14 14 0 1 0 16 -16 a16 16 0 0 1 -16 16 z" />

    <!-- Big Dipper / Constellation dots -->
    <circle cx="120" cy="30" r="2" fill="currentColor" />
    <circle cx="140" cy="38" r="1.5" fill="currentColor" />
    <circle cx="156" cy="46" r="2" fill="currentColor" />
    <circle cx="170" cy="60" r="1.5" fill="currentColor" />
    <path d="M120 30 l20 8 l16 8 l14 14" stroke-dasharray="2 3" opacity="0.6" />

    <!-- 4-point Sparkle Star -->
    <path d="M210 36 q0 12 12 12 q-12 0 -12 12 q0 -12 -12 -12 q12 0 12 -12 z" fill="currentColor" opacity="0.3" />

    <!-- Saturn Planet with Ring -->
    <circle cx="50" cy="140" r="10" />
    <ellipse cx="50" cy="140" rx="18" ry="5" transform="rotate(-20 50 140)" />

    <!-- Shooting Star -->
    <polygon points="140,116 142,122 148,123 143,127 145,133 140,129 135,133 137,127 132,123 138,122" />
    <path d="M136 126 l-20 16" stroke-dasharray="2 2" />

    <!-- Galaxy Spiral -->
    <path d="M200 140 a10 10 0 0 1 -10 10 a16 16 0 0 1 -16 -16 a22 22 0 0 1 22 -22" />

    <!-- Orbit Satellite -->
    <circle cx="120" cy="200" r="3" fill="currentColor" />
    <ellipse cx="120" cy="200" rx="16" ry="6" transform="rotate(25 120 200)" stroke-dasharray="3 3" />

    <!-- Small Star Clusters -->
    <circle cx="40" cy="210" r="1.5" fill="currentColor" />
    <circle cx="48" cy="216" r="1" fill="currentColor" />
    <circle cx="34" cy="222" r="1" fill="currentColor" />

    <polygon points="206,198 208,203 213,204 209,208 210,213 206,210 202,213 203,208 199,204 204,203" />

    <circle cx="80" cy="80" r="1" fill="currentColor" />
    <circle cx="16" cy="100" r="1.5" fill="currentColor" />
    <circle cx="94" cy="160" r="1" fill="currentColor" />
    <circle cx="160" cy="170" r="1" fill="currentColor" />
    <circle cx="230" cy="90" r="1.5" fill="currentColor" />
    <circle cx="230" cy="230" r="1.5" fill="currentColor" />
  </g>
</svg>
`;

// Botanical Leaf Pattern SVG
export const BOTANICAL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Monstera Leaf -->
    <path d="M40 24 c18 -8 32 10 24 30 c-8 18 -26 12 -28 -2 z" />
    <path d="M40 24 l12 28" />
    <path d="M46 36 q6 1 8 0" />
    <path d="M48 44 q6 1 6 0" />

    <!-- Fern Branch -->
    <path d="M130 50 q20 -20 40 -16" />
    <path d="M140 44 q4 -6 8 -4" />
    <path d="M148 40 q4 -6 8 -4" />
    <path d="M156 38 q4 -6 8 -4" />
    <path d="M138 48 q-4 -6 -8 -4" />
    <path d="M146 44 q-4 -6 -8 -4" />
    <path d="M154 42 q-4 -6 -8 -4" />

    <!-- Ginkgo Leaf -->
    <path d="M210 40 c-14 -12 -26 0 -16 16 c-6 4 -6 12 4 14 c14 2 20 -10 12 -30 z" />
    <path d="M202 70 l-6 14" />

    <!-- Four Leaf Clover -->
    <path d="M44 140 a7 7 0 0 0 -10 -10 a7 7 0 0 0 -10 10 a7 7 0 0 0 10 10 a7 7 0 0 0 10 -10 z" />
    <path d="M34 140 v12" />

    <!-- Palm Frond -->
    <path d="M120 120 c20 0 34 20 28 36 c-12 16 -34 4 -28 -36 z" />
    <path d="M120 120 l6 36" />

    <!-- Delicate Blossom -->
    <circle cx="204" cy="140" r="3" fill="currentColor" />
    <circle cx="204" cy="132" r="4" />
    <circle cx="212" cy="138" r="4" />
    <circle cx="208" cy="146" r="4" />
    <circle cx="200" cy="146" r="4" />
    <circle cx="196" cy="138" r="4" />

    <!-- Sprouting Seedling -->
    <path d="M46 220 c0 -14 10 -20 20 -16 c-2 10 -12 16 -20 16 z" />
    <path d="M46 220 c0 -14 -10 -20 -20 -16 c2 10 12 16 20 16 z" />
    <path d="M46 220 v12" />

    <!-- Succulent Blossom -->
    <polygon points="120,200 126,210 138,212 128,220 130,232 120,224 110,232 112,220 102,212 114,210" />

    <!-- Small Leaves -->
    <path d="M190 210 q10 -12 20 -4 q-10 12 -20 4 z" />
    <path d="M200 206 l6 12" />
  </g>
</svg>
`;

// Geometric Minimal Pattern SVG
export const GEOMETRIC_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8">
    <circle cx="20" cy="20" r="2" fill="currentColor" />
    <circle cx="60" cy="20" r="2" fill="currentColor" />
    <circle cx="100" cy="20" r="2" fill="currentColor" />
    <circle cx="20" cy="60" r="2" fill="currentColor" />
    <circle cx="60" cy="60" r="2" fill="currentColor" />
    <circle cx="100" cy="60" r="2" fill="currentColor" />
    <circle cx="20" cy="100" r="2" fill="currentColor" />
    <circle cx="60" cy="100" r="2" fill="currentColor" />
    <circle cx="100" cy="100" r="2" fill="currentColor" />

    <!-- Isometric Diamond Grid -->
    <polygon points="60,35 75,45 60,55 45,45" />
    <polygon points="60,75 75,85 60,95 45,85" />
    <polygon points="20,75 35,85 20,95 5,85" />
    <polygon points="100,75 115,85 100,95 85,85" />
  </g>
</svg>
`;

// Pre-defined Wallpapers matching WhatsApp & Premium Aesthetics
export const WALLPAPER_CATALOG: WallpaperConfig[] = [
  {
    id: 'whatsapp-classic',
    name: 'WhatsApp Classic',
    category: 'whatsapp',
    bgColor: '#EFEAE2', // WhatsApp official classic beige
    patternType: 'whatsapp-classic',
    doodleColor: '#000000',
    defaultOpacity: 0.28,
    isDark: false,
    tagline: 'The timeless, warm WhatsApp chat doodle you know & love',
    previewBg: '#EFEAE2',
    accentBubble: 'bg-[#005c4b] text-white',
  },
  {
    id: 'whatsapp-dark',
    name: 'WhatsApp Midnight',
    category: 'dark',
    bgColor: '#0B141A', // WhatsApp official dark theme background
    patternType: 'whatsapp-classic',
    doodleColor: '#8696a0',
    defaultOpacity: 0.16,
    isDark: true,
    tagline: 'Official WhatsApp dark mode with luminous muted outlines',
    previewBg: '#0B141A',
    accentBubble: 'bg-[#005c4b] text-white',
  },
  {
    id: 'whatsapp-romantic',
    name: 'Rose Romance Doodles',
    category: 'romantic',
    bgColor: '#FFF1F2', // Soft rose cream
    patternType: 'whatsapp-romantic',
    doodleColor: '#e11d48',
    defaultOpacity: 0.24,
    isDark: false,
    tagline: 'Hand-drawn couple love letters, polaroids, rings & hearts',
    previewBg: '#FFF1F2',
    accentBubble: 'bg-rose-500 text-white',
  },
  {
    id: 'whatsapp-sage',
    name: 'Sage Botanical Oasis',
    category: 'nature',
    bgColor: '#E8EFE9', // Calming sage green
    patternType: 'botanical',
    doodleColor: '#2d6a4f',
    defaultOpacity: 0.25,
    isDark: false,
    tagline: 'Tranquil garden leaves, monstera fronds & blossoms',
    previewBg: '#E8EFE9',
    accentBubble: 'bg-emerald-600 text-white',
  },
  {
    id: 'whatsapp-celestial',
    name: 'Celestial Starlight',
    category: 'dark',
    bgColor: '#0F172A', // Deep slate navy
    patternType: 'celestial',
    doodleColor: '#93C5FD',
    defaultOpacity: 0.28,
    isDark: true,
    tagline: 'Constellations, shooting stars & Saturn rings under the night sky',
    previewBg: '#0F172A',
    accentBubble: 'bg-indigo-600 text-white',
  },
  {
    id: 'whatsapp-lavender',
    name: 'Lavender Whisper',
    category: 'romantic',
    bgColor: '#F5F3FF', // Dreamy pastel lilac
    patternType: 'whatsapp-romantic',
    doodleColor: '#7C3AED',
    defaultOpacity: 0.22,
    isDark: false,
    tagline: 'Dreamy purple hues with romantic floating doodles',
    previewBg: '#F5F3FF',
    accentBubble: 'bg-purple-600 text-white',
  },
  {
    id: 'whatsapp-sunset',
    name: 'Golden Hour Dusk',
    category: 'whatsapp',
    bgColor: '#FFFBEB', // Golden amber cream
    patternType: 'whatsapp-classic',
    doodleColor: '#d97706',
    defaultOpacity: 0.26,
    isDark: false,
    tagline: 'Cozy, warm twilight amber with classic chat illustrations',
    previewBg: '#FFFBEB',
    accentBubble: 'bg-amber-600 text-white',
  },
  {
    id: 'minimal-grid',
    name: 'Architectural Grid',
    category: 'nature',
    bgColor: '#F8FAFC',
    patternType: 'geometric',
    doodleColor: '#64748B',
    defaultOpacity: 0.35,
    isDark: false,
    tagline: 'Modern, crisp isometric geometry & dot matrix',
    previewBg: '#F8FAFC',
    accentBubble: 'bg-slate-800 text-white',
  },
  {
    id: 'solid-kraft',
    name: 'Cozy Warm Kraft',
    category: 'solid',
    bgColor: '#E4DDD4',
    patternType: 'none',
    doodleColor: '#000000',
    defaultOpacity: 0,
    isDark: false,
    tagline: 'Clean, distraction-free textured warm cafe paper',
    previewBg: '#E4DDD4',
    accentBubble: 'bg-slate-700 text-white',
  },
  {
    id: 'solid-midnight',
    name: 'Pure OLED Slate',
    category: 'solid',
    bgColor: '#020617',
    patternType: 'none',
    doodleColor: '#ffffff',
    defaultOpacity: 0,
    isDark: true,
    tagline: 'Deep battery-saving darkness with zero background distractions',
    previewBg: '#020617',
    accentBubble: 'bg-slate-700 text-white',
  },
  {
    id: 'custom',
    name: 'Custom Couple Photo',
    category: 'romantic',
    bgColor: '#1E293B',
    patternType: 'whatsapp-romantic',
    doodleColor: '#ffffff',
    defaultOpacity: 0.15,
    isDark: true,
    tagline: 'Upload your own personal picture or romantic photo memory',
    previewBg: '#1E293B',
    accentBubble: 'bg-rose-500 text-white',
  },
];

const STORAGE_KEY_WALLPAPER = 'haven_chat_wallpaper_settings';

export const DEFAULT_WALLPAPER_SETTINGS: WallpaperSettings = {
  selectedId: 'whatsapp-classic',
  doodleOpacity: 0.28,
  interactiveParticles: true,
  particleType: 'hearts',
  dimming: 0,
  customImageUrl: null,
  customBgColor: null,
};

export function getSavedWallpaperSettings(): WallpaperSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WALLPAPER);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_WALLPAPER_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_WALLPAPER_SETTINGS;
}

export function saveWallpaperSettings(settings: WallpaperSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_WALLPAPER, JSON.stringify(settings));
  } catch {}
}

export function getSvgForPattern(pattern: PatternType): string {
  switch (pattern) {
    case 'whatsapp-classic':
      return WHATSAPP_CLASSIC_SVG;
    case 'whatsapp-romantic':
      return WHATSAPP_ROMANTIC_SVG;
    case 'celestial':
      return CELESTIAL_SVG;
    case 'botanical':
      return BOTANICAL_SVG;
    case 'geometric':
      return GEOMETRIC_SVG;
    default:
      return '';
  }
}
