import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  Search,
  Music,
  Headphones,
  Radio,
  Gamepad2,
  Swords,
  Tv,
  Palette,
  Globe2,
  Camera,
  Fingerprint,
  Sparkles,
  Heart,
  Moon,
  Sun,
  Clock,
  Wallpaper,
  ChevronRight,
  Play,
  Pause,
  Sliders,
  Check,
  ShieldCheck,
  FileText,
  Settings,
  Lock,
  Grid,
  Candy,
  Dices,
  QrCode,
  Smartphone,
  CircleDot,
} from 'lucide-react';
import { SpaceType } from '../types';
import { ColorMode, ThemeConfig, ThemeId, THEME_PRESETS } from '../utils/theme';

interface SpaceFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceType?: SpaceType;
  colorMode: ColorMode;
  onToggleColorMode: (mode?: ColorMode) => void;
  themeConfig?: ThemeConfig;
  onSelectTheme?: (themeId: ThemeId) => void;
  onOpenMusicLounge: () => void;
  onOpenSoundboard: () => void;
  onOpenGamesLounge: () => void;
  onOpenDraughts?: () => void;
  onOpenLudo?: () => void;
  onOpenCandyCrush?: () => void;
  onOpenChess: () => void;
  onOpenWatchTogether: () => void;
  onOpenCanvas: () => void;
  onOpenHorizon: () => void;
  onOpenPolaroidVault: () => void;
  onOpenTouchPulse: () => void;
  onOpenDailySpark: () => void;
  onOpenCareTracker: () => void;
  onOpenSleepSanctuary: () => void;
  onOpenTimeCapsule: () => void;
  onOpenBucketList: () => void;
  onOpenWallpaperPicker: () => void;
  onOpenThemePicker: () => void;
  isMusicPlaying?: boolean;
  currentMusicTitle?: string;
  onToggleMusicPlayPause?: () => void;
  onOpenSinglesLounge?: () => void;
  onOpenSecurity?: () => void;
  onOpenSettings?: () => void;
  onOpenActivityLog?: () => void;
  onOpenQRPairing?: () => void;
  onOpenInstallModal?: () => void;
  onOpenStatus?: () => void;
  hasUnreadStatus?: boolean;
}

type FeatureCategory = 'all' | 'media' | 'games' | 'creative' | 'bond' | 'settings';

interface FeatureItem {
  id: string;
  name: string;
  desc: string;
  category: FeatureCategory;
  icon: any;
  color: string;
  tag: string;
  action: () => void;
  highlight?: boolean;
}

export const SpaceFeaturesModal: React.FC<SpaceFeaturesModalProps> = ({
  isOpen,
  onClose,
  spaceType = 'couple',
  colorMode,
  onToggleColorMode,
  themeConfig,
  onSelectTheme,
  onOpenMusicLounge,
  onOpenSoundboard,
  onOpenGamesLounge,
  onOpenDraughts,
  onOpenLudo,
  onOpenCandyCrush,
  onOpenChess,
  onOpenWatchTogether,
  onOpenCanvas,
  onOpenHorizon,
  onOpenPolaroidVault,
  onOpenTouchPulse,
  onOpenDailySpark,
  onOpenCareTracker,
  onOpenSleepSanctuary,
  onOpenTimeCapsule,
  onOpenBucketList,
  onOpenWallpaperPicker,
  onOpenThemePicker,
  isMusicPlaying = false,
  currentMusicTitle,
  onToggleMusicPlayPause,
  onOpenSinglesLounge,
  onOpenSecurity,
  onOpenSettings,
  onOpenActivityLog,
  onOpenQRPairing,
  onOpenInstallModal,
  onOpenStatus,
  hasUnreadStatus = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FeatureCategory>('all');

  if (!isOpen) return null;

  const isDark = colorMode === 'dark';
  const isFriends = spaceType === 'friends';
  const isCouple = spaceType === 'couple';
  const isSingle = (spaceType as any) === 'single';

  // Base features shared between friends and couple spaces
  const sharedFeatures: FeatureItem[] = [
    ...(onOpenStatus ? [{
      id: 'haven-status',
      name: isFriends ? 'Squad Status & Stories' : 'Haven Status & Stories',
      desc: isFriends
        ? 'Share 24h photo & text updates with your squad. View friends’ stories, react & leave comments!'
        : 'Share 24h photo & notes with your partner. View updates & leave comments!',
      category: 'bond' as FeatureCategory,
      icon: CircleDot,
      color: 'text-[#00a884] bg-[#00a884]/15 border-[#00a884]/30',
      tag: '24h Stories',
      action: onOpenStatus,
      highlight: hasUnreadStatus,
    }] : []),
    {
      id: 'music-lounge',
      name: isFriends ? 'Squad Spotify Lounge' : 'Spotify Music Lounge',
      desc: 'Collaborative DJ streaming, search & Spotify background lounge',
      category: 'media' as FeatureCategory,
      icon: Headphones,
      color: 'text-[#1DB954] bg-[#1DB954]/15 border-[#1DB954]/30',
      tag: isMusicPlaying ? 'Streaming' : 'Spotify',
      action: onOpenMusicLounge,
      highlight: isMusicPlaying,
    },
    {
      id: 'soundboard',
      name: isFriends ? 'Live Squad Soundboard' : 'Love Soundboard',
      desc: isFriends
        ? 'Funny live squad reactions, applause, meme cues & sound FX'
        : 'Sweet reactions, applause, heartbeat cues & sound FX',
      category: 'media' as FeatureCategory,
      icon: Radio,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      tag: 'Live SFX',
      action: onOpenSoundboard,
    },
    {
      id: 'games-lounge',
      name: isFriends ? 'Party Games Lounge' : 'Games for Two & Couple Lounge',
      desc: isFriends
        ? 'Multiplayer Party games, Trivia, Draughts, Ludo & Candy Crush'
        : 'Connect Hearts, Trivia, Draughts, Ludo & Candy Crush Duels',
      category: 'games' as FeatureCategory,
      icon: Gamepad2,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      tag: 'Multiplayer',
      action: onOpenGamesLounge,
    },
    {
      id: 'draughts',
      name: isFriends ? 'Draughts (Checkers) Arena' : 'Draughts (Checkers) for Two',
      desc: 'Classic 8x8 checkers duel with king crowns & multi-jump captures',
      category: 'games' as FeatureCategory,
      icon: Grid,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      tag: 'Checkers Duel',
      action: () => {
        if (onOpenDraughts) onOpenDraughts();
        else onOpenGamesLounge();
      },
    },
    {
      id: 'ludo',
      name: isFriends ? 'Ludo Squad Arena' : 'Ludo Arena for Two',
      desc: 'Race 4 tokens home with animated 3D dice rolls & safe-star tactics',
      category: 'games' as FeatureCategory,
      icon: Dices,
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
      tag: 'Dice Board',
      action: () => {
        if (onOpenLudo) onOpenLudo();
        else onOpenGamesLounge();
      },
    },
    {
      id: 'candy-crush',
      name: isFriends ? 'Sweet Candy Crush Battle' : 'Sweet Candy Crush for Two',
      desc: 'Real-time match-3 puzzle battle with striped candies, bombs & cascades',
      category: 'games' as FeatureCategory,
      icon: Candy,
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
      tag: 'Match-3',
      action: () => {
        if (onOpenCandyCrush) onOpenCandyCrush();
        else onOpenGamesLounge();
      },
    },
    {
      id: 'chess',
      name: isFriends ? 'Squad Chess Match' : 'Live Real-time Chess',
      desc: 'Competitive 1v1 board match with move history & turn timer',
      category: 'games' as FeatureCategory,
      icon: Swords,
      color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
      tag: 'Classic',
      action: onOpenChess,
    },
    {
      id: 'watch-together',
      name: isFriends ? 'Squad Watch Party & YouTube' : 'Cinema & YouTube Direct',
      desc: 'Direct YouTube search without pasting URLs, synchronized playback & in-movie live reactions',
      category: 'media' as FeatureCategory,
      icon: Tv,
      color: 'text-red-500 bg-red-500/10 border-red-500/20',
      tag: 'YouTube Direct',
      action: onOpenWatchTogether,
    },
    {
      id: 'live-canvas',
      name: isFriends ? 'Live Squad Whiteboard & Canvas' : 'Live Whiteboard & Canvas',
      desc: 'Real-time collaborative doodle pad, stickers & brush tools',
      category: 'creative' as FeatureCategory,
      icon: Palette,
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
      tag: 'Real-time Drawing',
      action: onOpenCanvas,
    },
    {
      id: 'bucket-list',
      name: isFriends ? 'Squad Adventures & Goals' : 'Couple Bucket List',
      desc: isFriends
        ? 'Shared group trips, adventures, hangouts & bucket goals'
        : 'Shared dreams, travel bucket list, adventures & photo proofs',
      category: 'bond' as FeatureCategory,
      icon: Heart,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      tag: 'Goals',
      action: onOpenBucketList,
    },
    {
      id: 'wallpaper',
      name: 'Chat Wallpaper & Doodles',
      desc: 'Haven-style custom chat themes, doodles, glows & wallpapers',
      category: 'media' as FeatureCategory,
      icon: Wallpaper,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      tag: 'Customization',
      action: onOpenWallpaperPicker,
    },
    {
      id: 'theme-picker',
      name: 'Atmosphere & Color Palettes',
      desc: 'Switch between 6 living color themes with glowing ambient light',
      category: 'creative' as FeatureCategory,
      icon: Sliders,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
      tag: 'Palettes',
      action: onOpenThemePicker,
    },
    {
      id: 'encryption-security',
      name: 'End-to-End Encryption',
      desc: 'Verify safety numbers, WebRTC cryptographic keys & zero-knowledge status',
      category: 'settings' as FeatureCategory,
      icon: ShieldCheck,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      tag: 'Security',
      action: onOpenSecurity || (() => {}),
    },
    {
      id: 'activity-log',
      name: 'Activity & Audit Log',
      desc: 'Real-time security logs, call sessions, media sync & space events audit trail',
      category: 'settings' as FeatureCategory,
      icon: FileText,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      tag: 'Audit Trail',
      action: onOpenActivityLog || (() => {}),
    },
    {
      id: 'space-settings',
      name: isFriends ? 'Squad Settings & Members' : 'Space Settings & Members',
      desc: isFriends
        ? 'Squad nickname, custom emoji, member list & invite controls'
        : 'Change nicknames, anniversary date, avatars, invite links & history controls',
      category: 'settings' as FeatureCategory,
      icon: Settings,
      color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
      tag: 'Preferences',
      action: onOpenSettings || (() => {}),
    },
    ...(onOpenQRPairing ? [{
      id: 'qr-pairing',
      name: 'Instant QR Code Pairing',
      desc: 'Show or scan instant cryptographic QR code to link mobile & desktop',
      category: 'settings' as FeatureCategory,
      icon: QrCode,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
      tag: 'QR Link',
      action: onOpenQRPairing,
    }] : []),
    ...(onOpenInstallModal ? [{
      id: 'install-phone-app',
      name: 'Install Phone App & APK',
      desc: 'Install directly to Android/iOS home screen or generate standalone APK package',
      category: 'settings' as FeatureCategory,
      icon: Smartphone,
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
      tag: 'Mobile / APK',
      action: onOpenInstallModal,
    }] : []),
  ];

  // Couple intimacy & romantic features - ONLY for Couple space
  const coupleExclusiveFeatures: FeatureItem[] = [
    {
      id: 'horizon',
      name: 'Distance Radar & Horizon',
      desc: 'Live distance calculation, flight time, weather & sky sync',
      category: 'creative' as FeatureCategory,
      icon: Globe2,
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
      tag: 'GPS & Weather',
      action: onOpenHorizon,
    },
    {
      id: 'polaroids',
      name: 'Secret Polaroid Photo Vault',
      desc: 'End-to-end encrypted photo albums & anniversary memories wall',
      category: 'creative' as FeatureCategory,
      icon: Camera,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      tag: 'Encrypted Vault',
      action: onOpenPolaroidVault,
    },
    {
      id: 'touch-pulse',
      name: 'Touch Pulse & Haptics',
      desc: 'Feel simulated real-time heartbeats and touch vibrations',
      category: 'bond' as FeatureCategory,
      icon: Fingerprint,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      tag: 'Physical Touch',
      action: onOpenTouchPulse,
    },
    {
      id: 'daily-spark',
      name: 'Daily Spark & Reflection',
      desc: 'Thoughtful daily questions to deepen connection and laugh',
      category: 'bond' as FeatureCategory,
      icon: Sparkles,
      color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
      tag: 'Daily Habit',
      action: onOpenDailySpark,
    },
    {
      id: 'care-tracker',
      name: 'Care Tracker & Love Coupons',
      desc: 'Redeemable custom coupons, daily check-ins & hug counters',
      category: 'bond' as FeatureCategory,
      icon: Heart,
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
      tag: 'Kindness',
      action: onOpenCareTracker,
    },
    {
      id: 'sleep-sanctuary',
      name: 'Sleep Sanctuary',
      desc: 'Co-sleeping soundscapes (Rain, Fireplace, Ocean) & OLED dimming',
      category: 'bond' as FeatureCategory,
      icon: Moon,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      tag: 'Night & Relax',
      action: onOpenSleepSanctuary,
    },
    {
      id: 'time-capsule',
      name: 'Sealed Time Capsule',
      desc: 'Write locked future letters revealed on future dates or anniversaries',
      category: 'bond' as FeatureCategory,
      icon: Clock,
      color: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
      tag: 'Locked Future',
      action: onOpenTimeCapsule,
    },
  ];

  // Single exclusive features - ONLY for Single space
  const singleExclusiveFeatures: FeatureItem[] = onOpenSinglesLounge
    ? [
        {
          id: 'singles-lounge',
          name: 'Singles Lounge & Spark Hub',
          desc: 'Register profile, discover singles, send waves, or invite people',
          category: 'bond' as FeatureCategory,
          icon: Sparkles,
          color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
          tag: 'Community',
          action: onOpenSinglesLounge,
          highlight: true,
        },
      ]
    : [];

  const allFeatures: FeatureItem[] = isFriends
    ? sharedFeatures
    : isSingle
    ? [...singleExclusiveFeatures, ...sharedFeatures]
    : [...sharedFeatures, ...coupleExclusiveFeatures];

  const filteredFeatures = allFeatures.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all' as FeatureCategory, label: 'All Features', count: allFeatures.length },
    { id: 'media' as FeatureCategory, label: 'Media & Audio', count: allFeatures.filter((f) => f.category === 'media').length },
    { id: 'games' as FeatureCategory, label: 'Games & Play', count: allFeatures.filter((f) => f.category === 'games').length },
    { id: 'creative' as FeatureCategory, label: 'Creative & Radar', count: allFeatures.filter((f) => f.category === 'creative').length },
    { id: 'bond' as FeatureCategory, label: isFriends ? 'Squad Bond' : 'Love & Bond', count: allFeatures.filter((f) => f.category === 'bond').length },
    { id: 'settings' as FeatureCategory, label: 'Settings & Privacy', count: allFeatures.filter((f) => f.category === 'settings').length },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-3xl border-0 sm:border shadow-2xl overflow-hidden transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-purple-950/20'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/15'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div
          className={`px-3 sm:px-6 pt-3 sm:pt-5 pb-3 sm:pb-4 border-b shrink-0 sticky top-0 z-20 flex items-center justify-between gap-2 ${
            isDark ? 'border-slate-800 bg-slate-900/95 backdrop-blur-md' : 'border-slate-100 bg-white/95 backdrop-blur-md'
          }`}
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Haven Mobile Back Button */}
            <button
              onClick={onClose}
              id="btn-back-features-mobile"
              className={`p-2 -ml-1 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs sm:hidden shrink-0 ${
                isDark ? 'hover:bg-slate-800 text-rose-400 active:bg-slate-800' : 'hover:bg-rose-50 text-rose-600 active:bg-rose-100'
              }`}
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span className="text-xs font-bold">Back</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20 shrink-0">
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-bold font-serif tracking-tight truncate">
                  Feature Settings
                </h2>
                <span className="hidden xs:inline-block text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 shrink-0">
                  {isFriends ? 'Squad Hub' : 'Haven Suite'}
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                All space features, shared media, mini-games & controls
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
            title="Close Features"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interface Appearance Control (Light vs Dark Mode & Palette) */}
        <div
          className={`px-5 sm:px-6 py-3.5 border-b shrink-0 transition-colors ${
            isDark ? 'bg-slate-850/80 border-slate-800' : 'bg-slate-50/80 border-slate-100'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Interface Theme:
              </span>
              <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl">
                {/* Light Mode Button */}
                <button
                  id="theme-switch-light"
                  onClick={() => onToggleColorMode('light')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !isDark
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500 fill-amber-400' : ''}`} />
                  <span>Light</span>
                </button>

                {/* Dark Mode Button */}
                <button
                  id="theme-switch-dark"
                  onClick={() => onToggleColorMode('dark')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-900 text-white shadow-xs ring-1 ring-slate-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400 fill-indigo-400' : ''}`} />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Atmosphere Palette Quick Swatches */}
            {onSelectTheme && (
              <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Accent:
                </span>
                <div className="flex items-center gap-1.5">
                  {(Object.keys(THEME_PRESETS) as ThemeId[]).map((tid) => {
                    const preset = THEME_PRESETS[tid];
                    const isSelected = themeConfig?.id === tid;
                    return (
                      <button
                        key={tid}
                        onClick={() => onSelectTheme(tid)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isSelected ? 'ring-2 ring-offset-1 ring-pink-500 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.swatchColors[0] }}
                        title={`${preset.name} - ${preset.tagline}`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Music Playing Mini-Banner (if music is playing) */}
        {isMusicPlaying && (
          <div className="px-5 sm:px-6 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white flex items-center justify-between shrink-0 shadow-inner">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
                <Music className="w-4 h-4 text-yellow-300 animate-spin" />
              </div>
              <div className="truncate">
                <span className="text-[11px] text-pink-100 font-medium">Currently Playing: </span>
                <strong className="text-xs text-white">{currentMusicTitle || 'Web Jukebox Stream'}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {onToggleMusicPlayPause && (
                <button
                  onClick={onToggleMusicPlayPause}
                  className="px-2.5 py-1 rounded-lg bg-white/25 hover:bg-white/35 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-3 h-3 fill-white" />
                  <span>Pause</span>
                </button>
              )}
              <button
                onClick={() => {
                  onOpenMusicLounge();
                  onClose();
                }}
                className="px-2.5 py-1 rounded-lg bg-white text-purple-700 hover:bg-pink-50 text-xs font-bold cursor-pointer"
              >
                Open Lounge
              </button>
            </div>
          </div>
        )}

        {/* Search & Category Filter Bar */}
        <div
          className={`px-5 sm:px-6 py-3 border-b shrink-0 flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'
          }`}
        >
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features, games, tools..."
              className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm focus:outline-none transition-colors ${
                isDark
                  ? 'bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:border-pink-500'
                  : 'bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-pink-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Features Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredFeatures.length === 0 ? (
            <div className="py-16 text-center">
              <Sparkles className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                No features match "{searchQuery}"
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-3 text-xs text-pink-500 hover:underline font-bold cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
              {filteredFeatures.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.id}
                    onClick={() => {
                      feat.action();
                      onClose();
                    }}
                    className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      feat.highlight
                        ? 'border-purple-400 bg-purple-50/50 dark:bg-purple-950/20 shadow-md ring-1 ring-purple-400/40'
                        : isDark
                        ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 hover:border-slate-600 shadow-sm'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
                    } active:scale-[0.99]`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 ${feat.color}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            feat.highlight
                              ? 'bg-purple-500 text-white animate-pulse'
                              : isDark
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {feat.tag}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold tracking-tight mb-1 group-hover:text-pink-500 transition-colors">
                        {feat.name}
                      </h3>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {feat.desc}
                      </p>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-pink-600 dark:text-pink-400">
                      <span>Launch Activity</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div
          className={`px-6 py-3 border-t text-center text-xs ${
            isDark ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-100 bg-slate-50 text-slate-400'
          }`}
        >
          All space activities and media streams are encrypted and synchronized in real time.
        </div>
      </div>
    </div>
  );
};
