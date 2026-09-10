import React, { useState } from 'react';
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
}) => {
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
          ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-md shadow-black/20'
          : 'bg-white/95 border-rose-100/80 text-slate-900 shadow-xs'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
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
              {isFriends ? (
                <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${
                  isDark
                    ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{onlineCount >= 5 ? '5/5 (Squad Full)' : `${onlineCount}/5 in squad`}</span>
                </span>
              ) : (
                daysTogether && (
                  <span className={`hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    isDark
                      ? 'bg-rose-950/60 text-rose-300 border-rose-900/60'
                      : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    <Calendar className="w-3 h-3 text-rose-400" />
                    <span>Day {daysTogether} 💕</span>
                  </span>
                )
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

        {/* Right: Streamlined, uncluttered controls with All Space Features and Light/Dark toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Active Background Music Badge (Compact Pill) */}
          {isMusicPlaying && onOpenMusicLounge && (
            <button
              onClick={onOpenMusicLounge}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white text-xs font-bold animate-pulse shadow-xs cursor-pointer active:scale-95 transition-all"
              title={`Playing: ${currentMusicTitle || 'Lofi Stream'} (Click to open Lounge)`}
            >
              <Music className="w-3.5 h-3.5 animate-spin text-yellow-300" />
              <span className="max-w-28 truncate">{currentMusicTitle || 'Music Playing'}</span>
            </button>
          )}

          {/* LIGHT / DARK MODE TOGGLE INTERFACE ☀️🌙 */}
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

          {/* PROMINENT: ALL SPACE FEATURES & ACTIVITIES HUB BUTTON ✨ */}
          <button
            id="btn-open-all-features"
            onClick={onOpenAllFeatures || onOpenThemePicker}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-sm shadow-pink-500/25 transition-transform active:scale-95 cursor-pointer shrink-0"
            title="All Space Features & Activities (Music, Games, Live Canvas, Watch Party, Vault & more)"
          >
            <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">All Features</span>
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

          {/* Singles Lounge Button */}
          {onOpenSinglesLounge && (
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

          {/* Audio Call Button */}
          <button
            id="btn-start-audio-call"
            onClick={onStartAudioCall}
            className={`p-1.5 sm:px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
            }`}
            title={isFriends ? 'Squad Audio Call (Up to 5 friends)' : 'Encrypted Audio Call'}
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
                : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-rose-500/20'
            }`}
            title={isFriends ? 'Start Squad HD Video/Audio Call (Up to 5 friends)' : 'Encrypted HD Video Call'}
          >
            <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span className="hidden md:inline">{isFriends ? 'Squad Call' : 'Call'}</span>
          </button>

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
    </header>
  );
};
