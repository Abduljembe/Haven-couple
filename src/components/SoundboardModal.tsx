import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  Radio,
  Volume2,
  Sparkles,
  Zap,
  Flame,
  Laugh,
  Trophy,
  PartyPopper,
} from 'lucide-react';
import { SOUNDBOARD_PRESETS } from '../utils/sounds';

interface SoundboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaySound: (soundId: string, soundName: string, emoji: string) => void;
  currentUserName?: string;
  partnerName?: string;
}

export const SoundboardModal: React.FC<SoundboardModalProps> = ({
  isOpen,
  onClose,
  onPlaySound,
  currentUserName = 'You',
  partnerName = 'Partner',
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'hype' | 'fun' | 'fx'>('all');
  const [lastPlayedId, setLastPlayedId] = useState<string | null>(null);
  const [lastPlayedName, setLastPlayedName] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sound categories mapping
  const getCategory = (id: string): 'hype' | 'fun' | 'fx' => {
    if (['airhorn', 'victory', 'applause', 'levelup'].includes(id)) return 'hype';
    if (['rimshot', 'buzzer', 'quack', 'boing'].includes(id)) return 'fun';
    return 'fx';
  };

  const filteredSounds = SOUNDBOARD_PRESETS.filter((sound) => {
    if (activeCategory === 'all') return true;
    return getCategory(sound.id) === activeCategory;
  });

  const handleTriggerSound = (sound: (typeof SOUNDBOARD_PRESETS)[0]) => {
    setLastPlayedId(sound.id);
    setLastPlayedName(sound.name);
    sound.play();
    onPlaySound(sound.id, sound.name, sound.emoji);

    setTimeout(() => {
      setLastPlayedId((prev) => (prev === sound.id ? null : prev));
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-100 overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Back Button */}
            <button
              onClick={onClose}
              id="btn-soundboard-mobile-back"
              className="p-1.5 -ml-1 text-amber-700 hover:bg-amber-100 rounded-xl transition flex items-center gap-1 text-xs font-bold shrink-0 sm:hidden"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span>Back</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm sm:text-lg truncate">Live Soundboard</h3>
                <span className="hidden xs:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide shrink-0">
                  Instant Sync
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Trigger sound cues for both {currentUserName} and {partnerName} in real-time
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            title="Close Soundboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {[
              { id: 'all', label: 'All Sounds', icon: Sparkles },
              { id: 'hype', label: 'Hype & Cheers', icon: PartyPopper },
              { id: 'fun', label: 'Comedy & Memes', icon: Laugh },
              { id: 'fx', label: 'Sound FX', icon: Zap },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {lastPlayedName && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl animate-fade-in">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-medium">Played: {lastPlayedName}</span>
            </div>
          )}
        </div>

        {/* Sound Buttons Grid */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredSounds.map((sound) => {
              const isPlaying = lastPlayedId === sound.id;
              return (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => handleTriggerSound(sound)}
                  className={`group relative p-4 rounded-2xl border text-left transition-all duration-150 active:scale-95 cursor-pointer flex flex-col justify-between h-28 overflow-hidden shadow-xs hover:shadow-md ${
                    isPlaying
                      ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/40 scale-102'
                      : 'border-slate-200/80 bg-white hover:border-amber-300 hover:bg-gradient-to-br hover:from-white hover:to-amber-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl transition-transform group-hover:scale-110 group-active:scale-125">
                      {sound.emoji}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                        isPlaying
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-700'
                      }`}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-ping' : ''}`} />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-amber-900 line-clamp-1">
                      {sound.name}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium capitalize">
                      {getCategory(sound.id)}
                    </span>
                  </div>

                  {/* Gradient corner accent */}
                  <div
                    className={`absolute -bottom-6 -right-6 w-14 h-14 rounded-full bg-gradient-to-br ${sound.color} opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none`}
                  />
                </button>
              );
            })}
          </div>

          {filteredSounds.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Radio className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No sounds found in this category</p>
            </div>
          )}

          {/* Helper Tips */}
          <div className="mt-6 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <span className="font-semibold">Pro-tip:</span> Sounds play synthesized Web Audio cues with zero delay and sync instantly with your partner.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-time audio sync active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
