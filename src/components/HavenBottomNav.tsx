import React, { useState } from 'react';
import {
  MessageSquare,
  Phone,
  Video,
  Tv,
  Sparkles,
  Sliders,
  Settings,
  Users,
  ShieldCheck,
  Music,
  Headphones,
  X,
  Film,
  CircleDot,
} from 'lucide-react';
import { SpaceType } from '../types';

export interface HavenBottomNavProps {
  activeTab?: 'chat' | 'status' | 'calls' | 'cinema' | 'music' | 'singles' | 'features';
  onSelectTab?: (tab: 'chat' | 'status' | 'calls' | 'cinema' | 'music' | 'singles' | 'features') => void;
  spaceType?: SpaceType;
  unreadCount?: number;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
  onOpenWatchTogether: () => void;
  onOpenMusicLounge?: () => void;
  isMusicPlaying?: boolean;
  currentMusicTitle?: string;
  onOpenSinglesLounge?: () => void;
  onOpenStatus?: () => void;
  hasUnreadStatus?: boolean;
  onOpenFeatures: () => void;
  onOpenVoicemail?: () => void;
  isDark?: boolean;
}

export const HavenBottomNav: React.FC<HavenBottomNavProps> = ({
  activeTab = 'chat',
  onSelectTab,
  spaceType = 'couple',
  unreadCount = 0,
  onStartAudioCall,
  onStartVideoCall,
  onOpenWatchTogether,
  onOpenMusicLounge,
  isMusicPlaying = false,
  currentMusicTitle,
  onOpenSinglesLounge,
  onOpenStatus,
  hasUnreadStatus = false,
  onOpenFeatures,
  onOpenVoicemail,
  isDark = false,
}) => {
  const [showCallsMenu, setShowCallsMenu] = useState(false);

  const handleTabClick = (tab: 'chat' | 'status' | 'calls' | 'cinema' | 'music' | 'singles' | 'features') => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
    if (tab === 'status') {
      if (onOpenStatus) onOpenStatus();
    } else if (tab === 'calls') {
      setShowCallsMenu(true);
    } else if (tab === 'cinema') {
      onOpenWatchTogether();
    } else if (tab === 'music') {
      if (onOpenMusicLounge) onOpenMusicLounge();
    } else if (tab === 'singles') {
      if ((spaceType as any) === 'single' && onOpenSinglesLounge) {
        onOpenSinglesLounge();
      }
    } else if (tab === 'features') {
      onOpenFeatures();
    }
  };

  return (
    <>
      {/* Haven Call Options Action Sheet for Mobile */}
      {showCallsMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:hidden animate-in fade-in duration-200"
          onClick={() => setShowCallsMenu(false)}
        >
          <div
            className={`w-full rounded-t-3xl p-5 border-t shadow-2xl animate-in slide-in-from-bottom duration-250 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-base">Start Encrypted Call</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {spaceType === 'friends' ? 'Connect live with your squad' : 'Zero-knowledge WebRTC encrypted channel'}
                </p>
              </div>
              <button
                onClick={() => setShowCallsMenu(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2">
              <button
                onClick={() => {
                  setShowCallsMenu(false);
                  onStartAudioCall();
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 cursor-pointer ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-white'
                    : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100 text-emerald-900'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md mb-2">
                  <Phone className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm">Voice Call</span>
                <span className="text-[10px] opacity-75">Encrypted audio</span>
              </button>

              <button
                onClick={() => {
                  setShowCallsMenu(false);
                  onStartVideoCall();
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 cursor-pointer ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-white'
                    : 'bg-rose-50/70 border-rose-200 hover:bg-rose-100 text-rose-900'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md mb-2">
                  <Video className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm">Video Call</span>
                <span className="text-[10px] opacity-75">HD encrypted video</span>
              </button>
            </div>

            {onOpenVoicemail && (
              <button
                type="button"
                id="btn-bottomnav-voicemail"
                onClick={() => {
                  setShowCallsMenu(false);
                  onOpenVoicemail();
                }}
                className={`w-full py-3 px-4 rounded-2xl border flex items-center justify-center gap-2.5 transition active:scale-95 cursor-pointer font-semibold text-xs ${
                  isDark
                    ? 'bg-purple-950/60 border-purple-800 text-purple-200 hover:bg-purple-900/60'
                    : 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100'
                }`}
              >
                <Film className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Leave Offline Video / Voice Greeting 💌</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Haven Bottom Navigation Bar */}
      <nav
        id="haven-bottom-nav"
        className={`sm:hidden shrink-0 z-30 w-full border-t flex items-center justify-between px-1 py-1 transition-colors duration-200 ${
          isDark
            ? 'bg-slate-950/95 border-slate-800 text-slate-400'
            : 'bg-white/95 border-slate-200/90 text-slate-500'
        }`}
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Chats Tab */}
        <button
          type="button"
          onClick={() => handleTabClick('chat')}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'chat'
              ? isDark
                ? 'text-rose-400 font-bold'
                : 'text-rose-600 font-bold'
              : 'hover:text-slate-900 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <MessageSquare className={`w-5 h-5 ${activeTab === 'chat' ? 'stroke-[2.5]' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 min-w-[16px] h-4 rounded-full bg-emerald-500 text-white text-[9px] font-extrabold flex items-center justify-center border-2 border-white dark:border-slate-950">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">Chats</span>
        </button>

        {/* Calls Tab */}
        <button
          type="button"
          onClick={() => handleTabClick('calls')}
          className="flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 font-medium"
        >
          <Phone className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">Calls</span>
        </button>

        {/* Cinema / Watch Party Tab */}
        <button
          type="button"
          onClick={() => handleTabClick('cinema')}
          className="flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 font-medium"
        >
          <div className="relative">
            <Tv className="w-5 h-5 text-rose-500" />
            <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">Cinema</span>
        </button>

        {/* Spotify Music Lounge Tab */}
        {onOpenMusicLounge && (
          <button
            type="button"
            id="btn-haven-bottom-music"
            onClick={() => handleTabClick('music')}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isMusicPlaying
                ? 'text-[#1ed760] font-bold'
                : 'hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
            title="Spotify Music Lounge (Both DJ)"
          >
            <div className="relative">
              <Headphones className={`w-5 h-5 ${isMusicPlaying ? 'text-[#1DB954] animate-bounce' : 'text-slate-500 dark:text-slate-400'}`} />
              {isMusicPlaying && (
                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">Music</span>
          </button>
        )}

        {/* Haven Status / Updates Tab */}
        {onOpenStatus && (
          <button
            type="button"
            id="btn-haven-bottom-status"
            onClick={() => handleTabClick('status')}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 font-medium relative ${
              activeTab === 'status' ? 'text-[#00a884]' : isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <div className="relative">
              <CircleDot className={`w-5 h-5 ${activeTab === 'status' ? 'text-[#00a884]' : ''}`} />
              {hasUnreadStatus && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00a884] ring-2 ring-white dark:ring-[#111b21] animate-pulse" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">Status</span>
          </button>
        )}

        {/* Singles Lounge Tab (Only in explicit single space, never under friends or couple) */}
        {(spaceType as any) === 'single' && onOpenSinglesLounge && (
          <button
            type="button"
            onClick={() => handleTabClick('singles')}
            className="flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 font-medium"
          >
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">Singles</span>
          </button>
        )}

        {/* Feature Settings Tab */}
        <button
          type="button"
          id="btn-haven-bottom-features"
          onClick={() => handleTabClick('features')}
          className="flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 font-medium"
        >
          <div className="relative">
            <Sliders className="w-5 h-5 text-indigo-500" />
            <span className="absolute -top-1 -right-1.5 px-1 py-0.2 bg-gradient-to-r from-rose-500 to-indigo-600 text-[8px] font-bold text-white rounded-full">
              17
            </span>
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">Features</span>
        </button>
      </nav>
    </>
  );
};

export const WhatsAppBottomNav = HavenBottomNav;
export type WhatsAppBottomNavProps = HavenBottomNavProps;
