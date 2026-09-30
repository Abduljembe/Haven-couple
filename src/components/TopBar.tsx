import React, { useState } from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Heart,
  Phone,
  Video,
  ShieldCheck,
  Settings,
  Smile,
  Sparkles,
  Check,
  Calendar,
  Lock,
  Palette,
  Tv,
  Mail,
  Flame,
  Hand,
  Compass,
  Moon,
  Sun,
  Gamepad2,
  Camera,
  Globe2,
  HeartHandshake,
  Radio,
  Users,
  PartyPopper,
  Zap,
  Music,
  LayoutGrid,
  ChevronDown,
  Clock,
  Fingerprint,
  Wallpaper,
  Swords,
  MoreVertical,
  Sliders,
  FileText,
  X,
  Activity,
  Headphones,
  QrCode,
  Film,
  Bell,
  BellRing,
  Maximize2,
  Minimize2,
  CircleDot,
} from 'lucide-react';
import { UserProfile, SpaceType } from '../types';
import { ColorMode, ThemeConfig } from '../utils/theme';

interface TopBarProps {
  partner: UserProfile | null;
  partnerName: string;
  partnerAvatar: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  spaceType?: SpaceType;
  groupName?: string;
  groupEmoji?: string;
  roomMembers?: UserProfile[];
  isPartnerOnline: boolean;
  anniversaryDate?: string;
  isVerified: boolean;
  colorMode?: ColorMode;
  onToggleColorMode?: (mode?: ColorMode) => void;
  onOpenAllFeatures?: () => void;
  onOpenSecurity: () => void;
  onOpenSettings: () => void;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
  onSendLovePing: () => void;
  onOpenSoundboard?: () => void;
  onUpdateMood: (mood: string) => void;
  userMood: string;
  onOpenCanvas: () => void;
  onOpenWatchTogether: () => void;
  onOpenTimeCapsule: () => void;
  onOpenDailySpark: () => void;
  onOpenTouchPulse: () => void;
  onOpenBucketList: () => void;
  onOpenSleepSanctuary: () => void;
  onOpenGamesLounge: () => void;
  onOpenChess?: () => void;
  onOpenPolaroidVault: () => void;
  onOpenHorizon: () => void;
  onOpenCareTracker: () => void;
  onOpenThemePicker?: () => void;
  onOpenVibeSelector?: () => void;
  onTriggerLoveBuzz?: () => void;
  themeConfig?: ThemeConfig;
  onOpenMusicLounge?: () => void;
  isMusicPlaying?: boolean;
  currentMusicTitle?: string;
  onOpenWallpaperPicker?: () => void;
  onOpenSinglesLounge?: () => void;
  onOpenStatus?: () => void;
  hasUnreadStatus?: boolean;
  onOpenActivityLog?: () => void;
  onOpenSpacesManager?: () => void;
  onOpenDiagnostics?: () => void;
  onInviteSpouse?: () => void;
  onExitToLanding?: () => void;
  onOpenQRPairing?: () => void;
  pendingInviteCount?: number;
  pendingInvitePartnerName?: string;
  onAcceptPendingInvite?: () => void;
  onOpenVoicemail?: () => void;
  unreadVoicemailCount?: number;
  isChatFullscreen?: boolean;
  onToggleChatFullscreen?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  partner,
  partnerName,
  partnerAvatar,
  currentUserName,
  currentUserAvatar,
  spaceType = 'couple',
  groupName,
  groupEmoji = '🎉',
  roomMembers = [],
  isPartnerOnline,
  anniversaryDate,
  isVerified,
  colorMode = 'light',
  onToggleColorMode,
  onOpenAllFeatures,
  onOpenSecurity,
  onOpenSettings,
  onStartAudioCall,
  onStartVideoCall,
  onSendLovePing,
  onOpenSoundboard,
  onUpdateMood,
  userMood,
  onOpenCanvas,
  onOpenWatchTogether,
  onOpenTimeCapsule,
  onOpenDailySpark,
  onOpenTouchPulse,
  onOpenBucketList,
  onOpenSleepSanctuary,
  onOpenGamesLounge,
  onOpenChess,
  onOpenPolaroidVault,
  onOpenHorizon,
  onOpenCareTracker,
  onOpenThemePicker,
  onOpenVibeSelector,
  onTriggerLoveBuzz,
  themeConfig,
  onOpenMusicLounge,
  isMusicPlaying,
  currentMusicTitle,
  onOpenWallpaperPicker,
  onOpenSinglesLounge,
  onOpenStatus,
  hasUnreadStatus = false,
  onOpenActivityLog,
  onOpenSpacesManager,
  onOpenDiagnostics,
  onInviteSpouse,
  onExitToLanding,
  onOpenQRPairing,
  pendingInviteCount = 0,
  pendingInvitePartnerName,
  onAcceptPendingInvite,
  onOpenVoicemail,
  unreadVoicemailCount = 0,
  isChatFullscreen = false,
  onToggleChatFullscreen,
}) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isDark = colorMode === 'dark';
  const isFriends = spaceType === 'friends';
  const onlineCount = roomMembers.length > 0 ? roomMembers.length : (isPartnerOnline ? 2 : 1);

  // Calculate days together if anniversary date is set
  const calculateDaysTogether = () => {
    if (!anniversaryDate) return null;
    const start = new Date(anniversaryDate).getTime();
    const now = new Date().getTime();
    const diffDays = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
    return diffDays;
  };

  const daysTogether = calculateDaysTogether();

  return (
    <header
      className={`sticky top-0 z-30 w-full backdrop-blur-md border-b px-3 sm:px-4 py-2.5 transition-colors duration-300 ${
        isDark
          ? 'bg-[#202c33] border-[#222e35] text-[#e9edef] shadow-md shadow-black/30'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-xs'
      }`}
      style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0.625rem))' }}
    >
      <div className="w-full px-1 sm:px-3 flex items-center justify-between gap-2">
        {/* Left: Couple / Squad Avatars & Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0 flex items-center">
            {isFriends ? (
              /* Friends Squad Avatar Stack */
              <div
                onClick={onOpenSettings}
                className="flex items-center -space-x-2.5 cursor-pointer hover:opacity-95 transition-opacity"
                title="Click to view Squad members and invite link"
              >
                {roomMembers.length > 0 ? (
                  roomMembers.slice(0, 4).map((member, i) => (
                    <div
                      key={member.id || i}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 shadow-xs ${
                        isDark ? 'border-slate-900 bg-slate-800 ring-2 ring-indigo-500' : 'border-white bg-indigo-50 ring-2 ring-indigo-400'
                      }`}
                    >
                      <img
                        src={member.avatar || partnerAvatar}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))
                ) : (
                  <>
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 shadow-xs ${
                      isDark ? 'border-slate-900 bg-slate-800 ring-2 ring-indigo-500' : 'border-white bg-indigo-50 ring-2 ring-indigo-400'
                    }`}>
                      <img src={currentUserAvatar || partnerAvatar} alt="You" className="w-full h-full object-cover" />
                    </div>
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 shadow-xs flex items-center justify-center text-base ${
                      isDark ? 'border-slate-900 bg-purple-950/60 ring-2 ring-purple-500' : 'border-white bg-purple-50 ring-2 ring-purple-400'
                    }`}>
                      {groupEmoji}
                    </div>
                  </>
                )}
                {roomMembers.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-xs">
                    +{roomMembers.length - 4}
                  </div>
                )}
              </div>
            ) : (
              /* Couple 2-Avatar Badge */
              <>
                <div
                  onClick={onOpenSettings}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-rose-400/80 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                  title="Click to view space & avatar settings"
                >
                  <img
                    src={partner ? partner.avatar : partnerAvatar}
                    alt={partner ? partner.name : partnerName}
                    className="w-full h-full object-cover"
                  />
                </div>

                {currentUserAvatar && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className={`absolute -bottom-1 -right-2 w-6 h-6 rounded-full overflow-hidden border-2 ring-1 ring-rose-300 shadow-sm cursor-pointer hover:scale-110 transition-transform ${
                      isDark ? 'border-slate-900 bg-slate-800' : 'border-white bg-white'
                    }`}
                    title={`You (${currentUserName || 'You'}) - Click to change photo`}
                  >
                    <img
                      src={currentUserAvatar}
                      alt={currentUserName || 'My Avatar'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}

                {/* Online Indicator */}
                <span
                  className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 ${
                    isDark ? 'border-slate-900' : 'border-white'
                  } ${
                    isPartnerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                  title={isPartnerOnline ? 'Online with you' : 'Offline / Waiting'}
                />
              </>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className={`text-sm sm:text-base font-bold truncate font-serif flex items-center gap-1.5 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {isFriends ? (
                  <>
                    <span>{groupEmoji}</span>
                    <span>{groupName || 'Squad Hangout'}</span>
                  </>
                ) : (
                  partner ? partner.name : partnerName
                )}
              </h1>

              {!isFriends && daysTogether && (
                <span className={`hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                  isDark
                    ? 'bg-rose-950/60 text-rose-300 border-rose-900/60'
                    : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  <Calendar className="w-3 h-3 text-rose-400" />
                  <span>Day {daysTogether} 💕</span>
                </span>
              )}
            </div>

            {/* Live Status / Mood - Interactive */}
            {onOpenVibeSelector ? (
              <button
                id="btn-open-vibe-selector"
                onClick={onOpenVibeSelector}
                className={`text-[11px] sm:text-xs truncate flex items-center gap-1.5 mt-0.5 group cursor-pointer text-left py-0.5 px-1.5 -mx-1.5 rounded-lg transition-all border ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-transparent hover:border-slate-700'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent hover:border-slate-200'
                }`}
                title="Click to change your live mood & broadcast a vibe!"
              >
                {isFriends ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                    <span className="text-emerald-500 font-medium truncate group-hover:underline">
                      {onlineCount > 1 ? `${onlineCount} friends hanging out live 🎉` : 'Waiting for friends to join...'}
                    </span>
                  </>
                ) : isPartnerOnline ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                    <span className="text-emerald-500 font-medium truncate group-hover:underline">
                      {partner?.statusMood || userMood || 'Connected with you 💕'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} group-hover:underline`}>
                      Waiting for partner... (Set your vibe)
                    </span>
                  </>
                )}
                <span className="text-[10px] text-slate-400 opacity-60 group-hover:opacity-100">✎</span>
              </button>
            ) : (
              <div className={`text-[11px] sm:text-xs truncate flex items-center gap-1.5 mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {isFriends ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-emerald-500 font-medium truncate">
                      {onlineCount > 1 ? `${onlineCount} friends hanging out live 🎉` : 'Waiting for friends to join...'}
                    </span>
                  </>
                ) : isPartnerOnline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-emerald-500 font-medium truncate">
                      {partner?.statusMood || 'Connected with you 💕'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="text-slate-400">Waiting for partner...</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls: Haven Style on Mobile, Full Bar on Desktop */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 relative">
          {/* Pending Live Invitation Notification Pill */}
          {pendingInviteCount > 0 && onAcceptPendingInvite && (
            <button
              type="button"
              id="btn-topbar-accept-invite"
              onClick={onAcceptPendingInvite}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white shadow-lg shadow-rose-500/30 animate-pulse hover:opacity-95 active:scale-95 transition cursor-pointer shrink-0"
              title="Click to accept incoming partner invitation"
            >
              <Heart className="w-3.5 h-3.5 fill-white text-white shrink-0" />
              <span className="truncate max-w-[90px] sm:max-w-[160px]">
                {pendingInvitePartnerName ? `${pendingInvitePartnerName} invited you` : '💌 New Invite'}
              </span>
              <span className="bg-white/25 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase">
                Accept
              </span>
            </button>
          )}

          {/* --- MOBILE HAVEN HEADER (sm:hidden) --- */}
          <div className="flex sm:hidden items-center gap-1">
            {/* Haven Video Call Button */}
            <button
              id="btn-mobile-video-call"
              onClick={onStartVideoCall}
              className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? 'text-[#00a884] hover:bg-[#2a3942]'
                  : 'text-[#00a884] hover:bg-emerald-50'
              }`}
              title="Start Video Call"
            >
              <Video className="w-5 h-5" />
            </button>

            {/* Haven Voice Call Button */}
            <button
              id="btn-mobile-audio-call"
              onClick={onStartAudioCall}
              className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? 'text-[#e9edef] hover:bg-[#2a3942]'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="Start Voice Call"
            >
              <Phone className="w-4.5 h-4.5" />
            </button>

            {/* Mobile Music Lounge Button (Both can search & play) */}
            {/* Mobile Spotify Music Lounge Button */}
            {onOpenMusicLounge && (
              <button
                id="btn-mobile-music-lounge"
                onClick={onOpenMusicLounge}
                className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer relative ${
                  isMusicPlaying
                    ? 'text-[#1ed760] bg-[#1DB954]/20 ring-1 ring-[#1DB954]/50'
                    : isDark
                    ? 'text-zinc-300 hover:text-[#1ed760] hover:bg-[#2a3942]'
                    : 'text-zinc-700 hover:text-[#1DB954] hover:bg-emerald-50'
                }`}
                title="Spotify Music Lounge (Both DJ - Search & Play together)"
              >
                <Headphones className={`w-4.5 h-4.5 ${isMusicPlaying ? 'animate-pulse text-[#1ed760]' : ''}`} />
                {isMusicPlaying && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
                )}
              </button>
            )}

            {/* Haven 3-Dots Menu Button */}
            <button
              id="btn-haven-more-menu"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer ${
                showMobileMenu
                  ? isDark
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-200 text-slate-900'
                  : isDark
                  ? 'text-slate-300 hover:bg-slate-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Haven Menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Haven 3-Dots Dropdown Menu (Mobile Only) */}
          {showMobileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMobileMenu(false)}
              />
              <div
                id="haven-dropdown-menu"
                className={`absolute top-11 right-0 w-64 max-h-[calc(100dvh-60px)] overflow-y-auto overscroll-contain rounded-2xl border shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150 ${
                  isDark
                    ? 'bg-slate-900/98 border-slate-800 text-slate-100 divide-y divide-slate-800/80 shadow-black/60'
                    : 'bg-white/98 border-slate-200 text-slate-900 divide-y divide-slate-100 shadow-slate-300/50'
                }`}
              >
                {/* Primary Feature Settings Hub */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      if (onOpenAllFeatures) onOpenAllFeatures();
                    }}
                    className={`w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer text-left ${
                      isDark
                        ? 'hover:bg-rose-950/40 text-rose-300'
                        : 'hover:bg-rose-50 text-rose-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">Feature Settings</span>
                        <span className="text-[10px] opacity-75 font-normal">All 17 games & tools</span>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold">
                      17
                    </span>
                  </button>
                </div>

                {/* Entertainment & Connection */}
                <div className="py-1">
                  {onOpenWatchTogether && (
                    <button
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenWatchTogether();
                      }}
                      className={`w-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Tv className="w-4 h-4 text-rose-500" />
                      <span>{isFriends ? 'Squad Watch & YouTube' : 'Couple Cinema & YouTube'}</span>
                    </button>
                  )}

                  {onOpenMusicLounge && (
                    <button
                      id="btn-mobile-dropdown-music"
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenMusicLounge();
                      }}
                      className={`w-full px-4 py-2 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Headphones className="w-4 h-4 text-[#1DB954]" />
                        <div>
                          <span>Spotify Music Lounge</span>
                          <span className="block text-[10px] text-slate-400 font-normal">Both DJ — stream & sync tracks</span>
                        </div>
                      </div>
                      {isMusicPlaying && (
                        <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
                      )}
                    </button>
                  )}

                  {onOpenStatus && (
                    <button
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenStatus();
                      }}
                      className={`w-full px-4 py-2 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <CircleDot className="w-4 h-4 text-[#00a884]" />
                        <span>Status & Stories</span>
                      </div>
                      {hasUnreadStatus && (
                        <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse" />
                      )}
                    </button>
                  )}

                  {onOpenSinglesLounge && (spaceType as any) === 'single' && (
                    <button
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenSinglesLounge();
                      }}
                      className={`w-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Singles Lounge & Spark</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      onSendLovePing();
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                      isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                    <span>{isFriends ? 'Squad Cheers / Hype 🎉' : 'Heartbeat Nudge 💕'}</span>
                  </button>
                </div>

                {/* Customization & Appearance */}
                <div className="py-1">
                  {onOpenWallpaperPicker && (
                    <button
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenWallpaperPicker();
                      }}
                      className={`w-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Wallpaper className="w-4 h-4 text-emerald-500" />
                      <span>Chat Wallpaper</span>
                    </button>
                  )}

                  {onOpenThemePicker && (
                    <button
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenThemePicker();
                      }}
                      className={`w-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Palette className="w-4 h-4 text-indigo-500" />
                      <span>Atmosphere Themes</span>
                    </button>
                  )}

                  {onToggleColorMode && (
                    <button
                      onClick={() => {
                        setShowMobileMenu(false);
                        onToggleColorMode();
                      }}
                      className={`w-full px-4 py-2 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isDark ? (
                          <Sun className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Moon className="w-4 h-4 text-indigo-500" />
                        )}
                        <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                      </div>
                      <span className="text-[10px] opacity-60 uppercase">{colorMode}</span>
                    </button>
                  )}
                </div>

                {/* Security & Space Preferences */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      onOpenSecurity();
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                      isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Verify End-to-End Encryption</span>
                  </button>

                  {onOpenActivityLog && (
                    <button
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenActivityLog();
                      }}
                      className={`w-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>Activity & Audit Log</span>
                    </button>
                  )}

                  {onOpenVoicemail && (
                    <button
                      id="btn-mobile-voicemail"
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenVoicemail();
                      }}
                      className={`w-full px-4 py-2 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Film className="w-4 h-4 text-rose-500" />
                        <span>Private Voicemails & Greetings</span>
                      </div>
                      {unreadVoicemailCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                          {unreadVoicemailCount} New
                        </span>
                      )}
                    </button>
                  )}

                  <div className="px-3 py-1.5">
                    <PWAInstallButton variant="full" />
                  </div>

                  {onOpenSpacesManager && (
                    <button
                      id="btn-mobile-spaces-manager"
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenSpacesManager();
                      }}
                      className={`w-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Users className="w-4 h-4 text-rose-500" />
                      <span>Switch Space</span>
                    </button>
                  )}

                  {onOpenDiagnostics && (
                    <button
                      id="btn-mobile-diagnostics"
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenDiagnostics();
                      }}
                      className={`w-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Activity className="w-4 h-4 text-[#00a884]" />
                      <span>Audio & Video Call Diagnostics</span>
                    </button>
                  )}

                  {onInviteSpouse && (
                    <button
                      id="btn-mobile-invite-spouse"
                      onClick={() => {
                        setShowMobileMenu(false);
                        onInviteSpouse();
                      }}
                      className={`w-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark
                          ? 'hover:bg-slate-800 text-slate-200'
                          : isFriends
                          ? 'hover:bg-indigo-50 text-indigo-700'
                          : 'hover:bg-rose-50 text-rose-700'
                      }`}
                    >
                      {isFriends ? (
                        <Users className="w-4 h-4 text-indigo-500" />
                      ) : (
                        <Mail className="w-4 h-4 text-rose-500" />
                      )}
                      <span>{isFriends ? 'Invite Friends to Squad' : 'Invite Spouse by Email'}</span>
                    </button>
                  )}

                  {onOpenQRPairing && (
                    <button
                      id="btn-mobile-qr-pairing"
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenQRPairing();
                      }}
                      className={`w-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-violet-500" />
                      <span>Instant QR Pairing</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      onOpenSettings();
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                      isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Space Settings & Invite</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* --- DESKTOP FULL CONTROLS BAR (hidden sm:flex) --- */}
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
            {/* Shared Spotify Music Lounge DJ Button (Available to both participants) */}
            {onOpenMusicLounge && (
              <button
                id="btn-desktop-music-lounge"
                onClick={onOpenMusicLounge}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0 relative ${
                  isMusicPlaying
                    ? 'bg-[#1DB954] text-black hover:bg-[#1ed760] border-[#1DB954] shadow-md shadow-[#1DB954]/25'
                    : isDark
                    ? 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-[#1ed760] border-zinc-700 shadow-xs'
                    : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 hover:text-[#1DB954] border-zinc-300/80 shadow-xs'
                }`}
                title={
                  isMusicPlaying
                    ? `Playing: ${currentMusicTitle || 'Synced Stream'} (Music Lounge - Both DJ)`
                    : 'Music Lounge (Both DJ - Search, play & sync music)'
                }
              >
                <Headphones className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isMusicPlaying ? 'animate-bounce text-black' : 'text-[#1DB954]'}`} />
                {isMusicPlaying && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
                )}
              </button>
            )}

            {/* LIGHT / DARK MODE TOGGLE INTERFACE */}
            {onToggleColorMode && (
              <button
                id="btn-toggle-color-mode"
                onClick={() => onToggleColorMode()}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 ${
                  isDark
                    ? 'bg-slate-800/90 border-slate-700 text-amber-300 hover:bg-slate-700 shadow-xs ring-1 ring-amber-400/20'
                    : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700 shadow-xs'
                }`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-300 text-amber-300 transition-transform hover:rotate-45" />
                ) : (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 fill-indigo-100 transition-transform hover:-rotate-12" />
                )}
              </button>
            )}

            {/* Quick Hype / Love Ping */}
            <button
              id="btn-send-love-ping"
              onClick={onSendLovePing}
              className={`p-1.5 sm:p-2 rounded-xl border transition-all active:scale-95 cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-900/50 shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 shadow-xs'
              }`}
              title={isFriends ? 'Send Squad Hype & Cheers! 🎉' : 'Send Heartbeat Nudge 💕'}
            >
              {isFriends ? (
                <PartyPopper className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400 animate-bounce" />
              ) : (
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 fill-rose-500 animate-pulse" />
              )}
            </button>

            {/* ALL SPACE FEATURES & ACTIVITIES HUB BUTTON */}
            <button
              id="btn-open-all-features"
              onClick={onOpenAllFeatures || onOpenThemePicker}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-sm shadow-pink-500/25 transition-transform active:scale-95 cursor-pointer shrink-0"
              title="All Space Features & Activities (Music, Games, Live Canvas, Watch Party, Vault & more)"
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Feature Settings</span>
              <span className="hidden xs:inline sm:hidden text-[11px]">Hub</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/25 text-[10px] font-extrabold tracking-wider">
                17
              </span>
            </button>

            {/* Watch Party & YouTube Direct Access */}
            {onOpenWatchTogether && (
              <button
                id="btn-topbar-watch-together"
                onClick={onOpenWatchTogether}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isDark
                    ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/50'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                }`}
                title={isFriends ? 'Squad Watch Party & YouTube Search 🍿' : 'Couple Cinema & YouTube Search 🍿'}
              >
                <Tv className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden xl:inline text-xs font-semibold">
                  {isFriends ? 'Squad Watch' : 'Watch Party'}
                </span>
              </button>
            )}

            {/* Haven Status / Updates Button */}
            {onOpenStatus && (
              <button
                id="btn-topbar-status"
                onClick={onOpenStatus}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isDark
                    ? 'bg-slate-800/80 hover:bg-slate-700 text-[#00a884] border-slate-700'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-[#00a884] border-emerald-200'
                }`}
                title="Haven Status Updates & Stories"
              >
                <div className="relative">
                  <CircleDot className="w-3.5 h-3.5" />
                  {hasUnreadStatus && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#00a884] ring-1 ring-white dark:ring-slate-900 animate-pulse" />
                  )}
                </div>
                <span className="hidden lg:inline text-xs font-semibold">Status</span>
              </button>
            )}

            {/* Singles Lounge Button (Only in single space) */}
            {onOpenSinglesLounge && (spaceType as any) === 'single' && (
              <button
                id="btn-topbar-singles-lounge"
                onClick={onOpenSinglesLounge}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isDark
                    ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/50'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                }`}
                title="Singles Lounge & Spark Hub (Discover & Connect)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span className="hidden lg:inline text-xs font-semibold">Singles</span>
              </button>
            )}

            {/* Audio & Video Diagnostics Test Button */}
            {onOpenDiagnostics && (
              <button
                id="btn-topbar-diagnostics"
                onClick={onOpenDiagnostics}
                className={`p-1.5 sm:px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-[#00a884]'
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#00a884]'
                }`}
                title="Run Audio & Video Call Diagnostics"
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-xs">Diagnosis</span>
              </button>
            )}

            {/* EXTEND CHAT AREA TO FULL SCREEN BUTTON */}
            {onToggleChatFullscreen && (
              <button
                id="btn-toggle-chat-fullscreen"
                type="button"
                onClick={onToggleChatFullscreen}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isChatFullscreen
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-sm ring-1 ring-rose-400/40'
                    : isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
                title={isChatFullscreen ? 'Exit Full Screen Chat (Esc / F)' : 'Extend Chat Area to Full Screen (F)'}
              >
                {isChatFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                    <span className="hidden xl:inline text-xs font-semibold">Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                    <span className="hidden xl:inline text-xs font-semibold">Full Screen</span>
                  </>
                )}
              </button>
            )}

            {/* Audio Call Button */}
            <button
              id="btn-start-audio-call"
              onClick={onStartAudioCall}
              className={`p-1.5 sm:px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
              }`}
              title={isFriends ? 'Squad Audio Call (Unlimited friends)' : 'Encrypted Audio Call'}
            >
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Video Call Button */}
            <button
              id="btn-start-video-call"
              onClick={onStartVideoCall}
              className={`p-1.5 sm:px-3 rounded-xl text-white text-xs font-semibold flex items-center gap-1 sm:gap-1.5 shadow-md transition-all cursor-pointer shrink-0 ${
                isFriends
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 shadow-indigo-500/30'
                  : themeConfig?.buttonGradient || 'bg-[#00a884] hover:bg-[#008f6f] shadow-emerald-500/25'
              }`}
              title={isFriends ? 'Start Squad HD Video/Audio Call (Unlimited friends)' : 'Encrypted HD Video Call'}
            >
              <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span className="hidden md:inline">{isFriends ? 'Squad Call' : 'Video Call'}</span>
            </button>

            {/* Activity Log Button (Desktop) */}
            {onOpenActivityLog && (
              <button
                id="btn-open-activity-log"
                onClick={onOpenActivityLog}
                className={`p-1.5 sm:p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title="Activity & Security Audit Log"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
              </button>
            )}

            {/* Voicemails & Greetings Button (Desktop) */}
            {onOpenVoicemail && (
              <button
                id="btn-topbar-voicemails"
                onClick={onOpenVoicemail}
                className={`relative p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-semibold ${
                  unreadVoicemailCount > 0
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-500 dark:text-rose-400'
                    : isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                title="Private Voicemails & Greetings"
              >
                <Film className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden xl:inline">Voicemail</span>
                {unreadVoicemailCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5 sm:static sm:w-auto sm:h-auto sm:px-1.5 sm:py-0 sm:text-[10px] sm:font-bold sm:bg-rose-500 sm:text-white sm:rounded-full">
                    <span className="hidden sm:inline">{unreadVoicemailCount}</span>
                  </span>
                )}
              </button>
            )}

            {/* Install App Button (PWA) */}
            <PWAInstallButton variant="header" />

            {/* Switch / View Saved Spaces */}
            {onOpenSpacesManager && (
              <button
                id="btn-desktop-spaces-manager"
                onClick={onOpenSpacesManager}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-semibold ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                title="Switch between your saved spaces or join another space"
              >
                <Users className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden xl:inline">Spaces</span>
              </button>
            )}

            {/* Invite Friends / Spouse by Email */}
            {onInviteSpouse && (
              <button
                id="btn-topbar-invite-spouse"
                onClick={onInviteSpouse}
                className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs ${
                  isFriends
                    ? 'border-indigo-200/80 bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                    : 'border-rose-200/80 bg-rose-50 hover:bg-rose-100 text-rose-700'
                }`}
                title={isFriends ? 'Invite unlimited friends to squad' : 'Invite spouse to space via email'}
              >
                {isFriends ? (
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                ) : (
                  <Mail className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span className="hidden xl:inline">{isFriends ? 'Invite Friends' : 'Invite Spouse'}</span>
              </button>
            )}

            {/* Instant QR Pairing */}
            {onOpenQRPairing && (
              <button
                id="btn-desktop-qr-pairing"
                onClick={onOpenQRPairing}
                className={`p-1.5 sm:p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-violet-400 hover:text-violet-300'
                    : 'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-600 hover:text-violet-700'
                }`}
                title="Instant QR Code Pairing (Display & Scan)"
              >
                <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Space Settings & Invite */}
            <button
              id="btn-open-settings"
              onClick={onOpenSettings}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Space & Squad Settings / Invite Link"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
